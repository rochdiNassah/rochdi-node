'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');

const server = http2.createServer();

server.once('error', err => log('server error', err));

server.on('stream', (s, h) => {
  log('recv stream');
});

server.listen(8000);