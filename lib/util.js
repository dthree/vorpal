"use strict";

/**
 * Module dependencies.
 */

var _ = require("lodash")
  ;

var util = {

  /**
   * Parses command arguments from multiple
   * sources.
   *
   * @param {String} value
   * @param {String} env
   * @param {String} file
   * @return {Array}
   * @api private
   */

  parseArgs: function(value, env, file) {
    var reg = /[^\s'"]+|['"]([^'"]*)['"]/gi, str = value, arr = [], match;
    if (env) { arr.push(env); }
    if (file) { arr.push(file); }
    do {
      match = reg.exec(str);
      if (match !== null) {
        arr.push(match[1] ? match[1] : match[0]);
      }
    } while (match !== null);
    return arr;
  },

  /**
   * Makes an argument name pretty for help.
   *
   * @param {String} arg
   * @return {String}
   * @api private
   */

  humanReadableArgName: function(arg) {
    var nameOutput = arg.name + (arg.variadic === true ? "..." : "");
    return arg.required
      ? "<" + nameOutput + ">"
      : "[" + nameOutput + "]";
  },

  /**
   * Formats an array to display in a TTY
   * in a pretty fashion.
   *
   * @param {Array} arr
   * @return {String}
   * @api public
   */

  prettifyArray: function(arr) {
    arr = arr || [];
    var arrClone = _.clone(arr);
    var width = process.stdout.columns;
    var longest = (arrClone.sort(function(a, b) { return b.length - a.length; })[0] || "").length + 2;
    var fullWidth = String(arr.join("")).length;
    var fitsOneLine = ((fullWidth + (arr.length * 2)) <= width) ? true : false;
    var cols = Math.floor(width / longest);
    cols = (cols < 1) ? 1 : cols;
    if (fitsOneLine) {
      return arr.join("  ");
    } else {
      var col = 1;
      var lines = [];
      var line = "";
      for (var i = 0; i < arr.length; ++i) {
        if (col < cols) {
          col++;
        } else {
          lines.push(line);
          line = "";
          col = 1;
        }
        line += this.pad(arr[i], longest, " ");
      }
      if (line !== "") {
        lines.push(line);
      }
      return lines.join("\n");
    }
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

  pad: function(str, width, delimiter) {
    width = Math.floor(width);
    delimiter = delimiter || " ";
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(delimiter);
  },

  // When passing down applied args, we need to turn
  // them from `{ '0': 'foo', '1': 'bar' }` into ["foo", "bar"]
  // instead.
  fixArgsForApply: function(obj) {
    if (!_.isObject(obj)) {
      if (!_.isArray(obj)) {
        return [obj];
      } else {
        return obj;
      }
    }
    var argArray = [];
    _.each(obj, function(aarg) {
      argArray.push(aarg);
    });
    return argArray;
  }
};

/**
 * Expose `util`.
 */

module.exports = exports = util;


