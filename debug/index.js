'use strict';

const log = console.log.bind(console);

const { helpers, http2Client } = require('../src');
const { fetchIpAddress } = helpers;

void async function () {
  const ip = await fetchIpAddress();

  log(ip);
}();