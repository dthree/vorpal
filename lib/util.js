'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const minimist = require('minimist');
const strip = require('strip-ansi');

const util = {

  // When passing down applied args, we need to turn
  // them from `{ '0': 'foo', '1': 'bar' }` into ['foo', 'bar']
  // instead.
  fixArgsForApply: function (obj) {
    if (!_.isObject(obj)) {
      if (!_.isArray(obj)) {
        return [obj];
      }
      return obj;
    }
    const argArray = [];
    for (const key in obj) {
      const aarg = obj[key];
      argArray.push(aarg);
    }
    return argArray;
  }
};

/**
 * Expose `util`.
 */

module.exports = exports = util;
