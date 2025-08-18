'use strict';

const log = (...args) => (args[0] = '[server] '+args[0], console.log(...args));
const http2 = require('node:http2');
const helpers = require('../src/helpers');
const fs = require('node:fs');

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
      stream.respond({ ':status': 200, 'content-type': 'application/json' });
      stream.end(JSON.stringify({ processed_at: Date.now(), echo: { method: headers[':method'], userAgent: headers['user-agent'], data } }));
    })
  });
}

module.exports = server;

module.exports.startListen = function (port) {
  server.listen(port ?? PORT, log.bind(void 0, 'Listenings on port:', port ?? PORT));
};