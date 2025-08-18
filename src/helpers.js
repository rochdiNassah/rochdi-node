'use strict';

// anti production
global.exit = (...data) => (console.log(...data), process.exit());

const timerRegistry = {};
exports.endTimer = function (label, format = true) {
  if ('string' !== typeof label || !label.length) {
    throw new Error('helpers.endTimer: Expects label to be of type string and of length greater than 1.');
  }
  const currDate = new Date();
  const prevDate = timerRegistry[label];

  delete timerRegistry[label];

  const result = currDate-prevDate;
  return format && result ? exports.formatDuration(result) : result;
};

exports.startTimer = function (label) {
  if ('string' !== typeof label || !label.length) {
    throw new Error('helpers.startTimer: Expects label to be of type string and of length greater than 1.');
  }
  if (timerRegistry[label]) {
    return false;
  }
  timerRegistry[label] = new Date();
};

exports.wait = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

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