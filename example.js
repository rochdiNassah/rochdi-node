'use strict';

const log = console.log.bind(console);
const helpers = require('./src/helpers');
const Http2Client = require('./src');
const http2 = require('node:http2');
const server = require('./server');
const tls = require('node:tls');

const { startTimer, endTimer, wait, formatDuration, rand } = helpers;

const httpClient = new Http2Client({ retryOnError: false });

const endpoints = {
  api: {
    url: 'https://fakestoreapi.com/products',
    cipher: '',
    headers: {
      'user-agent': ''
    },
    body: {}
  },
  localhost: {
    url: 'http://127.1:2048',
    cipher: '',
    headers: {
      'user-agent': 'Foozilla 1.0.1',
      'accept': 'application/json'
    },
    body: 'foo'
  }
};

const { url, headers, cipher, body } = endpoints.api;

// This example will create a session, then send 1,000 requests
// result example: Request example complete | response count: 1000, took: 11 second(s), 896ms
async function request_example() { 
  log('Request example is in progress...'), startTimer('requestExample');
  const sessionKey = await httpClient.createSessionAsync(url), promises = [];
  for (let i = 0; 1e3 > i; ++i)
    promises.push(httpClient.get(url, { retryOnError: true, sessionKey }).then(res => log('response data rows size: %s', res.data.length)));
  return Promise.all(promises).then(results => log('Request example complete | response count: %d, took: %s', results.length, endTimer('requestExample')));
}

return request_example();