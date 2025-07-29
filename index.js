'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');

function X(o) {
  return new Http2Client({ ...o, userAgent: 'mozilla' });
}

const httpClient = new X({ retryOnError: true });

const session = httpClient.createSession('https://google.com');

let r = 0;
const cb = () => {
  const p = [];
  for (let i = 0; 64 > i; ++i) {
    p.push(httpClient.get('https://google.com', { session }).then(res => log(res.statusCode)));
  }
  Promise.all(p).then(() => {
    log('iteration#%d done', ++r);
    setTimeout(cb, 4e3);
  });
};

cb();