'use strict';

const log = console.log.bind(console);

const util = require('node:util');
const { format } = util;
const { helpers, Http2Client } = require('../src');
const http2 = require('node:http2');

// publish shorthand: 

const {
  awaitInternet,
  request,
  checkConnectivity,
  startTimer,
  getTimer,
  endTimer,
  formatDuration,
  wait,
  benchmark,
  fetchIpAddress
} = helpers;

const input = 'foo';

void async function () {
  const httpClient = new Http2Client({ retryOnError: true, userAgent: void 0 });

  awaitInternet().then(fetchIpAddress).then(ip => {
    log(ip);
  });
}();