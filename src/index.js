'use strict';

const EventEmitter = require('node:events');
const http2 = require('node:http2');
const zlib = require('node:zlib');
const urlParser = require('node:url').parse;
const helpers = require('./helpers');
const tls = require('node:tls');

const { rand } = helpers;

const log = console.log.bind(console);

class Http2Client extends EventEmitter {
  constructor(retryOnError = true, reqTimeout = 32e3) {
    super();

    this.reqTimeout = reqTimeout;
    this.retryOnError = retryOnError;
    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  get(...args) {
    return this._request('GET', ...args);
  }

  post(...args) {
    return this._request('POST', ...args);
  }

  options(...args) {
    return this._request('OPTIONS', ...args);
  }

  createSession(url, cipher) {
    const { sessions } = this;

    const key = this.sessionCounter++;

    if (cipher) tls.DEFAULT_CIPHERS = cipher;

    const expireCb = () => sessions.delete(key);

    const session = http2.connect(url).once('error', expireCb).once('close', expireCb);
    sessions.set(key, session);

    log('CREATE HTTP2 SESSION (MANUAL)');

    return session;
  }

  destroy() {
    const { sessions } = this;
    for (const session of sessions.values()) {
      session.destroy();
    }
  }

  _request(method, urlString, opts = {}) {
    return new Promise(resolve => {
      const { headers, body, cipher } = opts;
      const { protocol, path, host } = urlParser(urlString);
      const { sessions } = this;

      const options = {
        ':scheme': 'https',
        ':method': method,
        ':path': path,
        ...headers
      };
  
      const url = protocol+'//'+host;

      let session = opts.session;
      if (!session) {
        session = sessions.get(url);
        if (!session) {
          if (cipher) tls.DEFAULT_CIPHERS = cipher;
          const expireCb = () => sessions.delete(url);
          session = http2.connect(url).once('error', expireCb).once('close', expireCb);
          sessions.set(url, session);
          log('CREATE HTTP2 SESSION (AUTO)');
        }
      }

      let req = session.request(options)
        .once('error', onerror.bind(this, [method, urlString, opts], resolve))
        .once('response', headers => onresponse(headers, req, resolve));

      req.setTimeout(this.reqTimeout, onerror.bind(this, [method, urlString, opts], resolve));

      body && req.write(body);
      req.end();
    });
  }
}

function onerror(args, resolve) {
  if (!this.retryOnError) return (log('Request error'), resolve({ statusCode: -1 }));
  log('Request error | %s', 'Retrying...');
  setTimeout(() => resolve(this._request(...args)), rand(1e3, 5e3));
}

function onresponse(headers, req, resolve) {
  const res = { statusCode: headers[':status'], headers }, dataBuff = [];

  if ('gzip' === headers['content-encoding']) req = req.pipe(zlib.createGunzip());

  req.on('data', dataBuff.push.bind(dataBuff));
  req.once('end', () => {
    res.data = Buffer.concat(dataBuff).toString();
    try {
      res.data = JSON.parse(res.data);
    } catch (e) {}
    resolve(res);
  });
}

module.exports = Http2Client;