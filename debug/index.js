'use strict';

const log = console.log.bind(console);

const util = require('node:util');
const { format } = util;
const { helpers, Http2Client } = require('../src');
const http2 = require('node:http2');

// publish shorthand: 

const {
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
  const httpClient = new Http2Client({ retryOnError: false, userAgent: void 0 });

  const endpoints = [
    {
      authority: 'https://proxyconnection.touch.dofus.com',
      cipher: void 0
    },
    {
      authority: 'https://haapi.ankama.com',
      cipher: void 0
    },
  ];
  
  await httpClient.createSessionsAsync(endpoints);

  httpClient.get('https://proxyconnection.touch.dofus.com').then(res => {
    log(res.statusCode);

    httpClient.get('https://proxyconnection.touch.dofus.com').then(res => {
    log(res.statusCode);
  });

  httpClient.get('https://proxyconnection.touch.dofus.com').then(res => {
    log(res.statusCode);
  });
  });
}();