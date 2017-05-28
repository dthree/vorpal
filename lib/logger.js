/* eslint-disable no-magic-numbers */
/**
 * Module dependencies.
 */

const util = require('./util');
const ut = require('util');

/**
 * Initialize a new `Logger` instance.
 *
 * @return {Logger}
 * @api public
 */

function viewed(str) {
  const re = /\u001b\[\d+m/gm;

  return String(str).replace(re, '');
}

function trimTo(str, amt) {
  const visual = viewed(str).slice(0, amt);
  let raw = '';
  let result = '';
  for (let i = 0; i < str.length; i += 1) {
    raw += str[i];
    if (viewed(raw) === visual) {
      result = raw; break;
    }
  }

  if (result.length < amt - 10) {
    return result;
  }

  let newResult = result;
  let found = false;
  for (let j = result.length; j > 0; j -= 1) {
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

function Logger(logger = console) {
  this.log = (...args) => {
    logger.log.bind(logger, ...args);
  };

  this.log.cols = (...args) => {
    const width = process.stdout.columns;
    const input = args;
    let pads = 0;
    let padsWidth = 0;

    for (let h = 0; h < args.length; h += 1) {
      if (typeof args[h] === 'number') {
        padsWidth += args[h];
        pads += 1;
      }
      if (Array.isArray(args[h]) && typeof args[h][0] === 'number') {
        padsWidth += args[h][0];
        pads += 1;
      }
    }

    const cols = args.length - pads;
    const colsWidth = Math.floor((width - padsWidth) / cols);
    const lines = [];

    const go = () => {
      let str = '';
      let done = true;
      for (let i = 0; i < input.length; i += 1) {
        if (typeof input[i] === 'number') {
          str += util.pad('', input[i], ' ');
        } else if (Array.isArray(input[i]) && typeof input[i][0] === 'number') {
          str += util.pad('', input[i][0], input[i][1]);
        } else {
          const chosenWidth = colsWidth + 0;
          let trimmed = trimTo(input[i], colsWidth);
          const trimmedLength = trimmed.length;
          const re = /\\u001b\[\d+m/gm;
          const matches = ut.inspect(trimmed).match(re);
          let color = '';
          // Ugh. We're chopping a line, so we have to look for unfinished
          // color assignments and throw them on the next line.
          if (matches && matches[matches.length - 1] !== '\\u001b[39m') {
            trimmed += '\u001b[39m';
            const number = String(matches[matches.length - 1]).slice(7, 9);
            color = `\x1B[${number}m`;
          }
          input[i] = color + String(input[i].slice(trimmedLength, input[i].length)).trim();
          str += util.pad(String(trimmed).trim(), chosenWidth, ' ');
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
    for (let i = 0; i < lines.length; i += 1) {
      logger.log(lines[i]);
    }

    return this;
  };

  this.log.br = () => {
    logger.log(' ');

    return this;
  };

  return this.log;
}

/**
 * Expose `logger`.
 */

module.exports = Logger;
