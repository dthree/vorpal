'use strict';

/**
 * Expose `Option`.
 */

module.exports = exports = Option;

/**
 * Initialize a new `Option` instance.
 *
 * @param {String} flags
 * @param {String} description
 * @return {Option}
 * @api public
 */

function Option(flags, description) {
  this.flags = flags;
  this.required = ~flags.indexOf('<');
  this.optional = ~flags.indexOf('[');
  this.bool = !~flags.indexOf('-no-');
  flags = flags.split(/[ ,|]+/);
  if (flags.length > 1 && !/^[[<]/.test(flags[1])) {
    this.short = flags.shift();
  }
  this.long = flags.shift();
  this.description = description || '';
  return this;
}

/**
 * Return option name.
 *
 * @return {String}
 * @api private
 */

Option.prototype.name = function () {
  return this.long
    .replace('--', '')
    .replace('no-', '');
};

/**
 * Check if `arg` matches the short or long flag.
 *
 * @param {String} arg
 * @return {Boolean}
 * @api private
 */

Option.prototype.is = function (arg) {
  return (arg === this.short || arg === this.long);
};
