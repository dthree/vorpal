'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Option = function () {

  /**
   * Initialize a new `Option` instance.
   *
   * @param {String} flags
   * @param {String} description
   * @param {Autocomplete} autocomplete
   * @return {Option}
   * @api public
   */

  function Option(flags, description, autocomplete) {
    (0, _classCallCheck3.default)(this, Option);

    this.flags = flags;
    this.required = ~flags.indexOf('<');
    this.optional = ~flags.indexOf('[');
    this.bool = ! ~flags.indexOf('-no-');
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

  (0, _createClass3.default)(Option, [{
    key: 'name',
    value: function name() {
      if (this.long !== undefined) {
        return this.long.replace('--', '').replace('no-', '');
      }
      return this.short.replace('-', '');
    }

    /**
     * Check if `arg` matches the short or long flag.
     *
     * @param {String} arg
     * @return {Boolean}
     * @api private
     */

  }, {
    key: 'is',
    value: function is(arg) {
      return arg === this.short || arg === this.long;
    }

    /**
     * Assigned flag to either long or short.
     *
     * @param {String} flag
     * @api private
     */

  }, {
    key: 'assignFlag',
    value: function assignFlag(flag) {
      if (flag.startsWith('--')) {
        this.long = flag;
      } else {
        this.short = flag;
      }
    }
  }]);
  return Option;
}();

/**
 * Expose `Option`.
 */

module.exports = exports = Option;