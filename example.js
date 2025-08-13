'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');
const httpClient = new Http2Client({ retryOnError: true, userAgent: 'foobarbazquxquuxquuz' });

const url = 'fake-json-api.mock.beeceptor.com/users';

async function example() { // manual session
  const headers = { h: 'foo', h2: 'bar', h3: 'baz', h4: 'qux' };
  const session = httpClient.createSession(url), p = [];
  for (let j = 0; 2 > j; ++j)
    p.push(httpClient.get(url, { headers, session }).then(({ statusCode, data }) => log(statusCode, data.length)));
  await Promise.all(p);
}

function example2() { // auto session
  const p = [];
  for (let i = 0; 2 > i; ++i)
    p.push(httpClient.get(url, { headers: { Foo: 1, bar: 2 } }).then(({ statusCode, data }) => log(statusCode, data.length)));
  return Promise.all(p);
}

example().then(example2).then(() => log('Examples execution complete'));
// example();