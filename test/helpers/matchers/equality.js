'use strict';

beforeEach(() => {
  jasmine.addMatchers({
    isBetween: () => {
      return {
        compare: (val, min, max) => {
          return {
            pass: min <= val && max >= val
          }
        }
      }
    }
  });
});