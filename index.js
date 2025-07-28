'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');

function X(o) {
  return new Http2Client({ ...o, userAgent: 'mozilla' });
}

const httpClient = new X({ retryOnError: false });

httpClient.get('https://dgoogle.com').then(log);

// const cb = () => {
//   for (let i = 0; 118 > i; ++i) {
//     httpClient.get('https://google.com').then(res => log(res.statusCode));
//   }
//   // setTimeout(httpClient.destroy.bind(httpClient), 4e3);
// };

// cb();
// setInterval(cb, 1e3);