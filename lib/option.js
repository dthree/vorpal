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

  constructor(flags, description, options = {}) {
    options = typeof options === 'object' ? options : {
      autocomplete: options
    };

    this.autocomplete = options.autocomplete;
    this._default = options.default ? options.default : null;
    this.flags = flags;
    this.required = !!~flags.indexOf('<');
    this.optional = !!~flags.indexOf('[');
    this.bool = !~flags.indexOf('-no-');
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

  default() {
    return this._default;
  }
}

/**
 * Expose `Option`.
 */

module.exports = exports = Option;
