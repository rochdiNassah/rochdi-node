'use strict';

const log = console.log.bind(console);

const util = require('node:util');
const { format } = util;
const { helpers, http2Client } = require('../src');

const {
  startTimer,
  endTimer,
  formatDuration,
  wait,
  benchmark
} = helpers;

const input = 'foo';

void async function () {
  
}();