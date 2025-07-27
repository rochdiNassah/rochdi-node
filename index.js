'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');

function X(o) {
  return new Http2Client({ ...o, userAgent: 'mozilla' });
}

const httpClient = new X({ retryOnError: true });

const cb = () => {
  for (let i = 0; 1 > i; ++i) {
    httpClient.get('https://google.com', { headers: { 'foo': 1, 'User-Agent': '', 'bar': 2 } }).then(res => log(res.statusCode));
  }

  // setTimeout(httpClient.destroy.bind(httpClient), 4e3);
};

// cb();
// setInterval(cb, 1e3);