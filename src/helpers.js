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

const durationTypes = [
  [31104e6, ' year(s)'],
  [2592e6, ' month(s)'],
  [864e5, ' day(s)'],
  [36e5, ' hour(s)'],
  [6e4, ' minute(s)'],
  [1e3, ' second(s)'],
  [1, 'ms']
];
exports.formatDuration = function (ms) {
  const result = [];
  for (let i = 0, type, value; i < durationTypes.length; i++) {
    type = durationTypes[i];
    value = Math.floor(ms/type[0]);
    if (value) {
      ms -= type[0]*value;
      result.push(value+type[1]);
      if (1 < result.length) break;
    }
  }
  return result.join(', ');
};

exports.rand = (min, max) => {
  return Math.round(min+(Math.random()*(max-min)));
};