'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');
const httpClient = new Http2Client({ retryOnError: true, userAgent: 'foobarbazquxquuxquuz' });

const url = 'google.com';

async function example() { // manual session
  const headers = { h: 'foo', h2: 'bar', h3: 'baz', h4: 'qux' };
  for (let i = 0, lp = [], session; 4 > i; ++i) {
    session = httpClient.createSession(url);
    for (let j = 0; 2 > j; ++j)
      lp.push(httpClient.get(url, { headers, session }).then(res => log(res.statusCode)));
    await Promise.all(lp);
  }
}

function example2() { // auto session
  const p = [];
  for (let i = 0; 2 > i; ++i)
    p.push(httpClient.post(url, { headers: { Foo: 1, bar: 2 } }).then(res => log(res.statusCode)));
  return Promise.all(p);
}

example().then(example2).then(() => log('Examples execution complete'));
// example();