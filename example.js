'use strict';

const log = console.log.bind(console);
const helpers = require('./src/helpers');
const Http2Client = require('./src');

const { rand } = helpers;

const httpClient = new Http2Client({ retryOnError: false, userAgent: 'foobarbazquxquuxquuz' });

const endpoints = {
  fakeJsonApi: {
    url: 'fake-json-api.mock.beeceptor.com/users',
    cipher: '',
    headers: {},
    body: {}
  },
  localhost: {
    url: 'http://127.1:4096',
    cipher: '',
    headers: {},
    body: {}
  }
};

let error = 0, ok = 0;
function example() {
  const { url, headers } = endpoints.fakeJsonApi, promises = [];
  // const { url, headers } = endpoints.localhost, promises = [];
  const sessionKey = httpClient.createSession(url);
  for (let i = 0; 1e3 > i; ++i) promises.push(httpClient.get(url, { headers, sessionKey }).catch(err => new Object({ error: err })));
  return Promise.all(promises).then(entries => entries.map(entry => (entry.error?error++:ok++, entry.error||new Object({ statusCode: entry.statusCode, rows: entry.data.length }))));
}
return example().then(data => (setTimeout(Function.prototype, 1e3), log('example execution complete | error: %d, ok: %d', error, ok), httpClient.destroy()));