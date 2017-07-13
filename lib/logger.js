import pad from './utils/pad';

/**
 * Module dependencies.
 */

var _ = require('lodash');
var ut = require('util');

/**
 * Initialize a new `Logger` instance.
 *
 * @return {Logger}
 * @api public
 */

function viewed(str) {
  var re = /\u001b\[\d+m/gm;
  return String(str).replace(re, '');
}

function trimTo(str, amt) {
  var raw = '';
  var visual = viewed(str).slice(0, amt);
  var result = '';
  for (var i = 0; i < str.length; ++i) {
    raw += str[i];
    if (viewed(raw) === visual) {
      result = raw; break;
    }
  }

  if (result.length < amt - 10) {
    return result;
  }

  var newResult = result; var found = false;
  for (var j = result.length; j > 0; --j) {
    if (result[j] === ' ') {
      found = true;
      break;
    } else {
      newResult = newResult.slice(0, newResult.length - 1);
    }
  }

  if (found === true) {
    return newResult;
  }

  return result;
}

function Logger(cons) {
  var logger = cons || console;
  const log = function (...args) {
    logger.log(...args);
  };

  log.cols = function (...args) {
    var width = process.stdout.columns;
    var pads = 0;
    var padsWidth = 0;
    var cols = 0;
    var colsWidth = 0;
    var input = args;

    for (var h = 0; h < args.length; ++h) {
      if (typeof args[h] === 'number') {
        padsWidth += args[h];
        pads++;
      }
      if (_.isArray(args[h]) && typeof args[h][0] === 'number') {
        padsWidth += args[h][0];
        pads++;
      }
    }

    cols = args.length - pads;
    colsWidth = Math.floor((width - padsWidth) / cols);

    var lines = [];

    var go = function () {
      var str = '';
      var done = true;
      for (var i = 0; i < input.length; ++i) {
        if (typeof input[i] === 'number') {
          str += pad('', input[i]);
        } else if (_.isArray(input[i]) && typeof input[i][0] === 'number') {
          str += pad('', input[i][0], input[i][1]);
        } else {
          var chosenWidth = colsWidth + 0;
          var trimmed = trimTo(input[i], colsWidth);
          var trimmedLength = trimmed.length;
          var re = /\\u001b\[\d+m/gm;
          var matches = ut.inspect(trimmed).match(re);
          var color = '';
          // Ugh. We're chopping a line, so we have to look for unfinished
          // color assignments and throw them on the next line.
          if (matches && matches[matches.length - 1] !== '\\u001b[39m') {
            trimmed += '\u001b[39m';
            var number = String(matches[matches.length - 1]).slice(7, 9);
            color = '\x1B[' + number + 'm';
          }
          input[i] = color + String(input[i].slice(trimmedLength, input[i].length)).trim();
          str += pad(String(trimmed).trim(), chosenWidth);
          if (viewed(input[i]).trim() !== '') {
            done = false;
          }
        }
      }
      lines.push(str);
      if (!done) {
        go();
      }
    };
    go();
    for (var i = 0; i < lines.length; ++i) {
      logger.log(lines[i]);
    }
    return this;
  };

  log.br = function () {
    logger.log(' ');
    return this;
  };

  return this.log;
}

/**
 * Expose `logger`.
 */

module.exports = exports = Logger;
