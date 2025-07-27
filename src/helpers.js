'use strict';

exports.rand = (min, max) => {
  return Math.round(min+(Math.random()*(max-min)));
};