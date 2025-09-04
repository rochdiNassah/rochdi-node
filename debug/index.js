'use strict';

const log = console.log.bind(console);

const util = require('node:util');
const { format } = util;
const { helpers, http2Client } = require('../src');

// publish shorthand: 

const {
  startTimer,
  endTimer,
  formatDuration,
  wait,
  benchmark,
  fetchIpAddress
} = helpers;

const input = 'foo';

void async function () {
  
  fetchIpAddress().then(ip => {
    log(ip);
  });
  
}();