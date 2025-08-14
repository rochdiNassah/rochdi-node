'use strict';

global.exit = (...data) => (console.log(...data), process.exit());

exports.formatDuration = function (ms) {
  const types = [
    [31104e6, ' year(s)'],
    [2592e6, ' month(s)'],
    [864e5, ' day(s)'],
    [36e5, ' hour(s)'],
    [6e4, ' minute(s)'],
    [1e3, ' second(s)'],
    [1, 'ms']
  ];

  const r = [];
  for (let i = 0, t, v; i < types.length; i++) {
    t = types[i];
    v = Math.floor(ms/t[0]);
    if (v) {
      ms -= t[0]*v;
      r.push(v+t[1]);
      if (1 < r.length) {
        break;
      }
    }  
  }

  return r.join(', ');
};

exports.rand = (min, max) => {
  return Math.round(min+(Math.random()*(max-min)));
};

exports.padString = (string, padding, length = null, padRight = true) => {
  if (!Number.isInteger(length)) {
    if (padRight) {
      if (!string.endsWith(padding)) {
        string += padding;
      }
    } else {
      if (!string.startsWith(padding)) {
        string = padding + string;
      }
    }
  } else if (length !== string.length && length > 0) {
    if (padRight) {
      string += padding.repeat(length - string.length);
    } else {
      string = padding.repeat(length - string.length) + string;
    }
  }
  return string;
}