const { PADDING } = require('../constants');

/**
 * Pad a row on the start and end with spaces.
 */
module.exports = function padRow(value) {
  return value.split('\n').map(row => PADDING + row + PADDING).join('\n');
};
