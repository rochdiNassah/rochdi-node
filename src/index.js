'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');
const zlib = require('node:zlib');
const urlParser = require('node:url').parse;
const helpers = require('./helpers');
const tls = require('node:tls');

const { formatDuration, rand, padString } = helpers;

const NOOP = Function.prototype;
const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS;

module.exports = Http2Client;

function Http2Client(opts) {
  const { retryOnError, userAgent } = opts;

  this.retryOnError = retryOnError ?? true;
  this.userAgent = userAgent;

  this.sessions = new Map();
  this.sessionCounter = 0;
}

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
  return new Promise((resolve, reject) => {
    const { sessions } = this;

    url = padString(url, 'https://', void 0, false);
  
    if (void 0 === key) key = this.sessionCounter++;
  
    if (cipher) tls.DEFAULT_CIPHERS = cipher;

    const session = http2.connect(url, resolve.bind(void 0, key));
    session.rejectionCallbacks = [reject];
    session.once('error', () => (log('session error'), session.rejectionCallbacks.forEach(cb => cb())));

    tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS;

    sessions.set(key, session);
    log('session created (%s)', 'string' === typeof key ? 'auto' : 'manual');
  });
};

Http2Client.prototype._request = async function (method, urlString, opts) {
  urlString = padString(urlString, 'https://', void 0, false);

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

  let session, pp = {}, promise = new Promise((resolve, reject) => pp = { resolve, reject });

  if (void 0 !== sessionKey) {
    session = sessions.get(sessionKey);
    if (!session || session.destroyed) session = sessions.get(await this.createSession(url, cipher, sessionKey));
  } else session = sessions.get(url) ?? sessions.get(await this.createSession(url, cipher, url));

  session.rejectionCallbacks.push(promise.reject);

  const req = session.request(options).once('error', onerror.bind(this, arguments, pp)).once('response', headers => onresponse(headers, req, pp));

  if (body) req.write('object' === typeof body ? JSON.stringify(body) : body);

  return req.end(), promise;
};

function onerror(args, promise, err) {
  if (!this.retryOnError) return log('request error'), promise.reject();

  const retryTimeout = rand(1e3, 4e3);
  setTimeout(() => promise.resolve(this._request(...args)), retryTimeout);
  log('request error, retrying in %s...', formatDuration(retryTimeout));
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