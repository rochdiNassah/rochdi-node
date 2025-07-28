'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');

function X(o) {
  return new Http2Client({ ...o, userAgent: 'mozilla' });
}

const httpClient = new X({ retryOnError: true });

const sessions = [];

for (let i = 0; 4 > i; ++i) {
  sessions.push(httpClient.createSession('https://google.com'));
}

sessions.forEach(session => {
  httpClient.get('https://google.com', { session }).then(res => log(res.statusCode));
});

const cb = () => {
  for (let i = 0; 32 > i; ++i) {
    httpClient.get('https://google.com', { session }).then(res => log(res.statusCode));
  }
  // setTimeout(httpClient.destroy.bind(httpClient), 4e3);
};

// cb();
// setInterval(cb, 1e3);