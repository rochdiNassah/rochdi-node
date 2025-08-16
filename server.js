'use strict';

const log = console.log.bind(console);
const http2 = require('node:http2');
const helpers = require('./src/helpers');

const { rand } = helpers;

const PORT = 4096;

const server = http2.createServer();

server.on('error', err => log('server error', err)).listen(PORT, () => log('Listening on port %d', PORT));

server.on('session', session => {
  log('recv session', void session);
  // exit();
});
server.on('stream', stream => {
  log('recv stream');
  stream.write(JSON.stringify([0, 0]));
  setTimeout(stream.end.bind(stream), rand(0, 1));
});