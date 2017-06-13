const strip = require('strip-ansi');

/**
 * Pads a value with a space or a specified delimiter to match a given width.
 */
module.exports = function pad(value, width, delimiter = ' ') {
  return value + delimiter.repeat(Math.max(0, Math.floor(width) - strip(value).length));
};
