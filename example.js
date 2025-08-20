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
      'accept-encoding': 'gzip, deflate, br',
      'user-agent': ''
    },
    body: {}
  },
  localhost: {
    url: 'http://127.1:2048',
    cipher: '',
    headers: {
      'accept-encoding': 'gzip, deflate, br',
      'user-agent': 'foo/32.16.2',
      'accept': 'application/json'
    },
    body: 'foo'
  }
};

const { url, headers, cipher, body } = endpoints.api;

// this example will create a session, then send 1,000 asynchronous requests
// result example: 
function request_example() {
  log('request example execution in progress...'), startTimer('request_example');
  return httpClient.createSessionAsync(url).then(sessionKey => {
    const promises = [];
    for (let i = 0; 1e3 > i; ++i)
      promises.push(
        httpClient.get(url, { retryOnErrWor: true, headers, sessionKey }).then(({ data }) => log('response data rows size: %s', data.length))
      );
    return Promise.all(promises).then(
      results => log('request example complete, response count: %d, took: %s', results.length, endTimer('request_example'))
    );
  });
}

request_example().then(httpClient.destroy.bind(httpClient));