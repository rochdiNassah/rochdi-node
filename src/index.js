'use strict';

const log = console.log.bind(console);
const EventEmitter = require('node:events');
const http2 = require('node:http2');
const zlib = require('node:zlib');
const urlParser = require('node:url').parse;
const helpers = require('./helpers');
const tls = require('node:tls');

const { rand, padString } = helpers;

const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS;

class Http2Client extends EventEmitter {
  constructor(opts = {}) {
    super();

    const { timeout, retryOnError, userAgent } = opts;

    this.timeout = timeout ?? 4e3;
    this.retryOnError = retryOnError ?? true;
    this.userAgent = userAgent;

    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  get(...args) {
    return this._request('GET', ...args);
  }

  post(...args) {
    return this._request('POST', ...args);
  }

  delete(...args) {
    return this._request('DELETE', ...args);
  }

  patch(...args) {
    return this._request('PATCH', ...args);
  }

  put(...args) {
    return this._request('PUT', ...args);
  }

  options(...args) {
    return this._request('OPTIONS', ...args);
  }

  createSession(url, cipher, key) {
    const { sessions } = this;

    url = padString(url, 'https://', void 0, false);

    if (void 0 === key) key = this.sessionCounter++;
    if (cipher) tls.DEFAULT_CIPHERS = cipher;
    
    const expireCb = () => sessions.delete(key);
    const session = http2.connect(url).once('error', expireCb).once('close', expireCb);
    
    tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS;

    sessions.set(key, session);

    log('CREATE HTTP2 SESSION (%s)', 'string' === typeof key ? 'AUTO' : 'MANUAL');
    return key;
  }

  destroy() {
    const { sessions } = this;
    for (const session of sessions.values()) {
      session.destroy();
    }
    sessions.clear();
  }

  _request(method, urlString, opts = {}) {
    urlString = padString(urlString, 'https://', void 0, false);

    const { body, cipher } = opts;
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

    let sessionKey = opts.session, session, resolve;

    if (void 0 !== sessionKey) {
      session = sessions.get(sessionKey);
      if (!session || session.destroyed) session = sessions.get(this.createSession(url, cipher, sessionKey));
    } else session = sessions.get(url) ?? sessions.get(this.createSession(url, cipher, url));
    
    const promise = new Promise(r => resolve = r);
    const req = session.request(options)
      .once('error', onerror.bind(this, [method, urlString, opts], resolve))
      .once('response', headers => onresponse(headers, req, resolve));

    req.setTimeout(this.timeout, onerror.bind(this, [method, urlString, opts], resolve));

    if (body) req.write('object' === typeof body ? JSON.stringify(body) : body);
    req.end();

    return promise;
  }
}

function onerror(args, resolve) {
  if (!this.retryOnError) return log('requestError'), resolve({ statusCode: -1 });
  log('Request error | %s', 'Retrying...');
  setTimeout(() => resolve(this._request(...args)), rand(1e3, 3e3));
}

function onresponse(headers, req, resolve) {
  const contentEncoding = headers['content-encoding'], buff = [];

  if ('gzip' === contentEncoding) req = req.pipe(zlib.createGunzip());

  req.on('data', buff.push.bind(buff));
  req.once('end', () => {
    let data = String(Buffer.concat(buff));

    try {
      data = JSON.parse(data)
    } catch (e) {};

    resolve({ statusCode: headers[':status'], headers, data });
  });
}

module.exports = Http2Client;