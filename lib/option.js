'use strict';

class Option {

  /**
   * Initialize a new `Option` instance.
   *
   * @param {String} flags
   * @param {String} description
   * @param {Autocomplete} autocomplete
   * @return {Option}
   * @api public
   */

  constructor(flags, description, autocomplete) {
    this.flags = flags;
    this.required = ~flags.indexOf('<');
    this.optional = ~flags.indexOf('[');
    this.bool = !~flags.indexOf('-no-');
    this.autocomplete = autocomplete;
    flags = flags.split(/[ ,|]+/);
    if (flags.length > 1 && !/^[[<]/.test(flags[1])) {
      this.assignFlag(flags.shift());
    }
    this.assignFlag(flags.shift());
    this.description = description || '';
  }

  /**
   * Return option name.
   *
   * @return {String}
   * @api private
   */

  name() {
    if (this.long !== undefined) {
      return this.long
        .replace('--', '')
        .replace('no-', '');
    }
    return this.short
      .replace('-', '');
  }

  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {String} arg
   * @return {Boolean}
   * @api private
   */

  is(arg) {
    return (arg === this.short || arg === this.long);
  }

  /**
   * Assigned flag to either long or short.
   *
   * @param {String} flag
   * @api private
   */

  assignFlag(flag) {
    if (flag.startsWith('--')) {
      this.long = flag;
    } else {
      this.short = flag;
    }
  }
}

/**
 * Expose `Option`.
 */

module.exports = exports = Option;
