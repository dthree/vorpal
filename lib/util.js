'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const minimist = require('minimist');
const strip = require('strip-ansi');

const util = {

  /**
   * Makes an argument name pretty for help.
   *
   * @param {String} arg
   * @return {String}
   * @api private
   */

  humanReadableArgName: function (arg) {
    const nameOutput = arg.name + (arg.variadic === true ? '...' : '');
    return arg.required ?
      `<${nameOutput}>` :
      `[${nameOutput}]`;
  },

  /**
   * Formats an array to display in a TTY
   * in a pretty fashion.
   *
   * @param {Array} arr
   * @return {String}
   * @api public
   */

  prettifyArray: function (arr) {
    arr = arr || [];
    const arrClone = _.clone(arr);
    const width = process.stdout.columns;
    const longest = strip((arrClone.sort(function (a, b) {
      return strip(b).length - strip(a).length;
    })[0] || '')).length + 2;
    const fullWidth = strip(String(arr.join(''))).length;
    const fitsOneLine = ((fullWidth + (arr.length * 2)) <= width);
    let cols = Math.floor(width / longest);
    cols = (cols < 1) ? 1 : cols;
    if (fitsOneLine) {
      return arr.join('  ');
    }
    let col = 0;
    const lines = [];
    let line = '';
    for (const key in arr) {
      const arrEl = arr[key];
      if (col < cols) {
        col++;
      } else {
        lines.push(line);
        line = '';
        col = 1;
      }
      line += this.pad(arrEl, longest, ' ');
    }
    if (line !== '') {
      lines.push(line);
    }
    return lines.join('\n');
  },

  /**
   * Pads a value with with space or
   * a specified delimiter to match a
   * given width.
   *
   * @param {String} str
   * @param {Integer} width
   * @param {String} delimiter
   * @return {String}
   * @api private
   */

  pad: function (str, width, delimiter) {
    width = Math.floor(width);
    delimiter = delimiter || ' ';
    const len = Math.max(0, width - strip(str).length);
    return str + Array(len + 1).join(delimiter);
  },

  /**
   * Pad a row on the start and end with spaces.
   *
   * @param {String} str
   * @return {String}
   */
  padRow: function (str) {
    return str.split('\n').map(function (row) {
      return '  ' + row + '  ';
    }).join('\n');
  },

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
