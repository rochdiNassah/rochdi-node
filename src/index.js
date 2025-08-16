'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');
const zlib = require('node:zlib');
const urlParser = require('node:url').parse;
const helpers = require('./helpers');
const tls = require('node:tls');
const EventEmitter = require('node:events');

const { formatDuration, rand, padString } = helpers;

const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS;

module.exports = Http2Client;

function Http2Client(opts) {
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

Http2Client.prototype.createSession = function (url, cipher, key) {
  log('creating session...');

  const { sessions } = this;

  if (!url.startsWith('http')) url = padString(url, 'https://', void 0, false);

  if (cipher) tls.DEFAULT_CIPHERS = cipher;
  const session = http2.connect(url).once('error', () => log('session error')).once('close', () => log('session close'));
  tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS;

  if (void 0 === key) key = this.sessionCounter++;

  session.key = key;
  session.cipher = cipher;
  session.url = url;

  sessions.set(key, session);
  
  return log('session created (%s)', 'string' === typeof key ? 'auto' : 'manual'), key;
};

Http2Client.prototype._request = async function (method, urlString, opts) {
  if (!urlString.startsWith('http')) urlString = padString(urlString, 'https://', void 0, false);
 
  const { body, cipher, sessionKey } = opts;
  const { protocol, path, host } = urlParser(urlString);
  const { sessions, userAgent } = this;

  const headers = { ...opts.headers };

  if (userAgent && headers) {
    const keys = ['user-agent', 'User-Agent'];
    for (let i = 0, key; keys.length > i; ++i) {
      key = keys[i];
      if (headers.hasOwnProperty(key)) {
        if (!headers[key].length) headers[key] = userAgent;
        break;
      }
    }
  }

  const options = { ':scheme': 'https', ':method': method, ':path': path, ...headers };
  const url = protocol+'//'+host;

  let session, rr = {}, promise = new Promise((resolve, reject) => rr = { resolve, reject });

  if (void 0 !== sessionKey) {
    session = sessions.get(sessionKey);
    if (!session || session.destroyed || session.closed) session = sessions.get(this.createSession(url, cipher, sessionKey));
  } else {
    session = sessions.get(url);
    if (!session || session.destroyed || session.closed) session = sessions.get(this.createSession(url, cipher, url));
  }

  const req = session.request(options).once('error', onerror.bind(this, arguments, rr)).once('response', headers => onresponse(headers, req, rr));

  if (body) req.write('object' === typeof body ? JSON.stringify(body) : body);

  return req.end(), promise;
};

function onerror(args, promise, err) {
  if (!(args[2].retryOnError ?? this.retryOnError)) return promise.reject(err.code);
  const jitter = rand(1e3, 4e3);
  setTimeout(() => promise.resolve(this._request(...args)), jitter);
  log('request error, retrying in %s...', formatDuration(jitter));
}

function onresponse(headers, req, promise) {
  const contentEncoding = headers['content-encoding'], buff = [];

  if ('gzip' === contentEncoding) req = req.pipe(zlib.createGunzip());

  req.on('data', buff.push.bind(buff));
  req.once('end', () => {
    let data = String(Buffer.concat(buff));

    try {
      data = JSON.parse(data)
    } catch (e) {};

    promise.resolve({ statusCode: headers[':status'], headers, data });
  });
}