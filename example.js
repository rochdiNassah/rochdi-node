'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');
const httpClient = new Http2Client({ retryOnError: true, userAgent: 'foobarbazquxquuxquuz' });

const url = 'fake-json-api.mock.beeceptor.com/users';

async function example() { // manual session
  const headers = { h: 'foo', h2: 'bar', h3: 'baz', h4: 'qux' };
  const sessionKey = await httpClient.createSession(url), p = [];
  for (let i = 0; 2 > i; ++i) p.push(httpClient.get(url, { headers, sessionKey }));
  return Promise.all(p);
}

function example2() { // auto session
  return httpClient.get(url, { headers: { Foo: 1, bar: 2 } }).then(({ statusCode, data }) => log(statusCode, data.length)).then(() => {
    const p = [];
    for (let i = 0; 2 > i; ++i) p.push(httpClient.get(url, { headers: { Foo: 1, bar: 2 } })); // session will be derived from the previous one
    return Promise.all(p);
  });
}

example().then(() => {
  httpClient.destroy();
  setTimeout(Function.prototype, 1e3);
  log('example execution complete');
}).then(example2).then(() => {
  httpClient.destroy();
  setTimeout(Function.prototype, 1e3);
  log('example2 execution complete');
});