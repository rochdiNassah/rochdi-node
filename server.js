'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');

const server = http2.createServer(res => {
  log(1)
});

server.once('error', err => log('server error', err));

server.on('stream', (s, h) => {
  log('recv stream');
  s.once('close', () => log(1));
  s.end();
});

server.on('connect', log);

server.listen(8000);