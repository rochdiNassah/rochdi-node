'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');
const helpers = require('../../src/helpers');
const fs = require('node:fs');
const zlib = require('node:zlib');

const { rand } = helpers;

const PORT = 4096;
// const [key, cert] = ['key.pem', 'cert.pem'].map(fileName => fs.readFileSync(__dirname+'/'+fileName));

const server = http2.createServer().once('error', err => exit('server error |', err.code));

server.on('session', on_session);

function on_session(session) {
  log('received a session');

  session.once('error', err => log('session error |', err.code));

  session.on('stream', (stream, headers, flags) => {
    let data = '';
    
    stream.on('data', chunk => data += chunk);
    stream.once('end', () => {
      let responseData = JSON.stringify({ processed_at: Date.now(), echo: { method: headers[':method'], userAgent: headers['user-agent'], data } });

      const acceptEncoding = headers['accept-encoding'];
      const responseHeaders = {
        ':status': 200
      };

      if (acceptEncoding) {
        const match = Array.from(new RegExp(/(\w+)/g)[Symbol.matchAll](acceptEncoding));
        if (match.length) {
          const contentEncoding = match[0][0];
          if (['gzip', 'deflate', 'br'].includes(contentEncoding)) {
            responseHeaders['content-encoding'] = contentEncoding;
            if ('gzip' === contentEncoding) {
              responseData = zlib.gzipSync(responseData);
            } else if ('deflate' === contentEncoding) {
              responseData = zlib.deflateSync(responseData);
            } else if ('br' === contentEncoding) {
              responseData = zlib.brotliCompressSync(responseData);
            }
          }
        }
      }

      stream.respond(responseHeaders)
      stream.end(responseData);
    });
  });
}

module.exports = server;

module.exports.startListen = function (port) {
  server.listen(port ?? PORT, log.bind(void 0, 'Listenings on port:', port ?? PORT));
};