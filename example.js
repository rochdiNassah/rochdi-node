'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');
const httpClient = new Http2Client({ retryOnError: true, userAgent: 'Foo' });

const url = 'https://google.com';

async function example() { // Manual session
  for (let i = 0, lp = [], session; 4 > i; ++i) {
    session = httpClient.createSession(url);
    for (let j = 0; 8 > j; ++j)
    lp.push(httpClient.get(url, { headers: { Foo: 1, bar: 2 }, session }).then(res => log(res.statusCode)));
    await Promise.all(lp);
  }
}

function example2() { // Auto session
  const p = [];
  for (let i = 0; 4 > i; ++i)
  p.push(httpClient.post(url, { headers: { Foo: 1, bar: 2 } }).then(res => log(res.statusCode)));
  return Promise.all(p);
}

example().then(example2);