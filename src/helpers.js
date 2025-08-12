'use strict';

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