# Usage
```
const Http2Client = require('rochdi-http2client')
const httpClient = new Http2Client({ retryOnError: true, timeout: 3e3, userAgent: 'Foo' });

httpClient.post('https://github.com', { headers: { a: 1, b: 2 }, body: 'foo' }).then(res => {
  const { statusCode, data } = res;
  console.log(data, statusCode);
});
```
