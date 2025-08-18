'use strict';

const server = require('../server');
const Client = require('../src');

const client = new Client(), PORT = 4096;

const { url, headers, cipher, body } = {
  url: 'http://127.1:'+PORT,
  headers: {},
  cipher: '',
  body: 'foo'
};

server.startListen(PORT);

describe('response', () => {
  it('should receive a valid response', async () => {
    for (let i = 0; 1e4 > i; ++i)
      expect(await client.post(url, { headers, cipher, body }).then(res => res.data.echo.data)).toBe(body);
  });
});