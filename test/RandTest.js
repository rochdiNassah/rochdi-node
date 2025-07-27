'use strict';

const { rand } = require('../src/helpers');

describe('rand', () => {
  it('should be bound to the input range $min and $max', () => {
    expect(rand(-4, 4)).isBetween(-4, 4);
  });
});