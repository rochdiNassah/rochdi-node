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

  options(...args) {
    return this._request('OPTIONS', ...args);
  }

  createSession(url, cipher) {
    return new Promise(r => {
      const { sessions } = this;

      const key = this.sessionCounter++;

      if (cipher) tls.DEFAULT_CIPHERS = cipher;

      log('Creating HTTP2 session...');

      const expireCb = () => sessions.delete(key);
      const session = http2.connect(url).once('error', expireCb).once('close', expireCb);
      sessions.set(key, session);

      session.once('connect', () => {
        log('CREATE HTTP2 SESSION (MANUAL)');
        r(session);
      });
    });
  }

  destroy() {
    const { sessions } = this;
    for (const session of sessions.values()) {
      session.destroy();
    }
    sessions.clear();
  }

  _request(method, urlString, opts = {}) {
    return new Promise(async resolve => {
      const { headers, body, cipher } = opts;
      const { protocol, path, host } = urlParser(urlString);
      const { sessions } = this;

      if (this.userAgent && headers) {
        const keys = ['user-agent', 'User-Agent'];
        for (let i = 0, key; keys.length > i; ++i) {
          key = keys[i];
          if (headers.hasOwnProperty(key)) {
            if (!headers[key].length) {
              headers[key] = this.userAgent;
            }
            break;
          }
        }
      }

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
        if (!session || session.destroyed) {
          if (cipher) tls.DEFAULT_CIPHERS = cipher;
          const expireCb = () => sessions.delete(url);
          session = http2.connect(url).once('error', () => {
            log('session error');
            expireCb();
          }).once('close', () => {
            log('session close');
            expireCb();
          });
          sessions.set(url, session);
          log(session);
          await new Promise(r => session.once('connect', r));
          log('CREATE HTTP2 SESSION (AUTO)');
        }
      }

      return log(session);

      let req = session.request(options)
        .once('error', onerror.bind(this, [method, urlString, opts], resolve))
        .once('response', headers => onresponse(headers, req, resolve));

      req.setTimeout(this.timeout, onerror.bind(this, [method, urlString, opts], resolve));

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