'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');
const zlib = require('node:zlib');
const urlParser = require('node:url').parse;
const helpers = require('./helpers');
const tls = require('node:tls');
const EventEmitter = require('node:events');

const { formatDuration, rand } = helpers;

const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const USER_AGENT_REGEXP = new RegExp(/^user\-agent$/i);

module.exports = Http2Client;

function Http2Client(opts = {}) {
  const { retryOnError, userAgent } = opts;

  this.retryOnError = retryOnError ?? true;
  this.userAgent = userAgent;

  this.sessions = new Map();
  this.sessionCounter = 0;
}

Http2Client.prototype = new EventEmitter();

['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE', 'HEAD'].forEach(method => {
  Http2Client.prototype[method.toLowerCase()] = function () {
    return this._request(method, ...arguments);
  };
});

Http2Client.prototype.destroy = function () {
  const { sessions } = this;
  for (const session of sessions.values()) session.destroy();
  sessions.clear();
};

Http2Client.prototype.createSessionAsync = function () {
  return new Promise(resolve => {
    const key = this.createSession(...arguments);
    this.sessions.get(key).on('connect', () => resolve(key));
  });
}

Http2Client.prototype.createSession = function (authority, cipher, key) {
  const { sessions } = this;

  if (cipher) setImmediate(() => tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS), tls.DEFAULT_CIPHERS = cipher;

  const session = http2.connect(authority, () => log('session connect ok(%s)', session.key));

  session.once('error', e => log('session error|', e.code)).once('close', () => log('session close'));
  
  if (void 0 === key) key = this.sessionCounter++;

  session.key = key;
  session.cipher = cipher;
  session.authority = authority;

  return sessions.set(key, session), log('session created (%s)', 'string' === typeof key ? 'auto' : 'manual'), key;
};

Http2Client.prototype._request = async function (method, urlString, opts = {}) { 
  const { body, cipher } = opts;
  const { protocol, host, path } = urlParser(urlString);
  const { sessions, userAgent } = this;

  const headers = { ...opts.headers };

  const headerKeys = Object.keys(headers);
  for (let i = 0, key, match; headerKeys.length > i; ++i) {
    key = headerKeys[i];
    if (match = USER_AGENT_REGEXP.exec(key)) {
      if (!headers[key].length)
          headers[key] = userAgent ?? DEFAULT_USER_AGENT;
      break;
    }
  }

  const authority = protocol+'//'+host;
  const sessionKey = opts.sessionKey ?? authority;
  const options = { ':scheme': 'https', ':method': method, ':path': path, ...headers };

  let rr, session = sessions.get(sessionKey);
  if (!session || cipher !== session.cipher || session.destroyed || session.closed) {
    session = sessions.get(this.createSession(authority, cipher, sessionKey));
  }

  const promise = new Promise((resolve, reject) => rr = { resolve, reject });
  const stream = session.request(options).on('error', onerror.bind(this, arguments, rr)).on('response', h => onresponse(h, stream, rr));
  return body && stream.write('object' === typeof body ? JSON.stringify(body) : body), stream.end(), promise;
};

function onerror(args, promise, err) {
  if (!((args[2] && args[2].retryOnError) ?? this.retryOnError)) return promise.reject(err.code);

  const jitter = rand(1e3, 4e3);
  setTimeout(() => promise.resolve(this._request(...args)), jitter);
  log('request error, retrying in %s...', formatDuration(jitter));
}

async function onresponse(headers, stream, promise) {
  const responseBuffer = [];
  const statusCode = headers[':status'];
  const responseEncoding = headers['content-encoding'];

  if ('gzip' === responseEncoding) stream = stream.pipe(zlib.createGunzip());
  else if ('deflate' === responseEncoding) stream = stream.pipe(zlib.createInflate());
  else if ('br' === responseEncoding) stream = stream.pipe(zlib.createBrotliDecompress());

  stream.on('data', responseBuffer.push.bind(responseBuffer))
  stream.on('end', () => {
    let data = String(Buffer.concat(responseBuffer));
    try {
      data = JSON.parse(data);
    } catch {}
    promise.resolve({ headers, data, statusCode });
  });
}