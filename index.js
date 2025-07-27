'use strict';

const log = console.log.bind(console);

const Http2Client = require('./src');

const httpClient = new Http2Client(true, 4e3);

const session = httpClient.createSession('https://google.com');

setInterval(() => {
  httpClient.get('https://google.com', { session }).then(res => {
    console.log(res.statusCode);
  });
}, 4e3);