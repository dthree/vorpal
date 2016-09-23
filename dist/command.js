'use strict';

/**
 * Module dependencies.
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _option = require('./option');

var _option2 = _interopRequireDefault(_option);

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Converts string to camel case.
 *
 * @param {String} flag
 * @return {String}
 * @api private
 */
function _camelcase(flag) {
  return flag.split('-').reduce(function (str, word) {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

module.exports = function (_EventEmitter) {
  _inherits(Command, _EventEmitter);

  function Command(name, parent) {
    _classCallCheck(this, Command);

    var _this = _possibleConstructorReturn(this, (Command.__proto__ || Object.getPrototypeOf(Command)).apply(this, arguments));

    if (!(_this instanceof Command)) {
      var _ret;

      return _ret = new Command(), _possibleConstructorReturn(_this, _ret);
    }

    _this.commands = [];
    _this.options = [];
    _this._args = [];
    _this._aliases = [];
    _this._name = name;
    _this._relay = false;
    _this._hidden = false;
    _this._parent = parent;
    _this._mode = false;
    _this._catch = false;
    _this._help = undefined;
    _this._init = undefined;
    _this._after = undefined;
    _this._allowUnknownOptions = false;
    return _this;
  }

  /**
   * Registers an option for given command.
   *
   * @param {String} flags
   * @param {String} description
   * @param {Function} fn
   * @param {String} defaultValue
   * @return {Command}
   * @api public
   */


  _createClass(Command, [{
    key: 'option',
    value: function option(flags, description) {
      var _this2 = this;

      var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var option = new _option2.default(flags, description, options);
      var oname = option.name();
      var name = _camelcase(oname);
      var defaultValue = void 0;

      // preassign default value only for --no-*, [optional], or <required>
      if (option.bool === false || option.optional || option.required) {
        // when --no-* we make sure default is true
        if (option.bool === false) {
          defaultValue = true;
        }
        // preassign only if we have a default
        if (defaultValue !== undefined) {
          this[name] = defaultValue;
        }
      }

      // register the option
      this.options.push(option);

      // when it's passed assign the value
      // and conditionally invoke the callback
      this.on(oname, function (val) {
        // unassigned or bool
        if (typeof _this2[name] === 'boolean' || typeof _this2[name] === 'undefined') {
          // if no value, bool true, and we have a default, then use it!
          if (val === null) {
            _this2[name] = option.bool ? defaultValue || true : false;
          } else {
            _this2[name] = val;
          }
        } else if (val !== null) {
          // reassign
          _this2[name] = val;
        }
      });

      return this;
    }

    /**
     * Defines an action for a given command.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'action',
    value: function action(fn) {
      this._fn = fn;

      return this;
    }

    /**
     * Defines a function to validate arguments
     * before action is performed. Arguments
     * are valid if no errors are thrown from
     * the function.
     *
     * @param fn
     * @returns {Command}
     * @api public
     */

  }, {
    key: 'validate',
    value: function validate(fn) {
      this._validate = fn;
      return this;
    }

    /**
     * Defines a function to be called when the
     * command is canceled.
     *
     * @param fn
     * @returns {Command}
     * @api public
     */

  }, {
    key: 'cancel',
    value: function cancel(fn) {
      this._cancel = fn;
      return this;
    }

    /**
     * Defines a method to be called when
     * the command set has completed.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'done',
    value: function done(fn) {
      this._done = fn;
      return this;
    }

    /**
     * Defines tabbed auto-completion
     * for the given command. Favored over
     * deprecated command.autocompletion.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'autocomplete',
    value: function autocomplete(obj) {
      this._autocomplete = obj;
      return this;
    }

    /**
     * Defines tabbed auto-completion rules
     * for the given command.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'autocompletion',
    value: function autocompletion(param) {
      this._parent._useDeprecatedAutocompletion = true;
      if (!_lodash2.default.isFunction(param) && !_lodash2.default.isObject(param)) {
        throw new Error('An invalid object type was passed into the first parameter of command.autocompletion: function expected.');
      }

      this._autocompletion = param;
      return this;
    }

    /**
     * Defines an init action for a mode command.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'init',
    value: function init(fn) {
      if (this._mode !== true) {
        throw Error('Cannot call init from a non-mode action.');
      }
      this._init = fn;
      return this;
    }

    /**
     * Defines a prompt delimiter for a
     * mode once entered.
     *
     * @param {String} delimiter
     * @return {Command}
     * @api public
     */

  }, {
    key: 'delimiter',
    value: function delimiter(_delimiter) {
      this._delimiter = _delimiter;
      return this;
    }

    /**
     * Sets args for static typing of options
     * using minimist.
     *
     * @param {Object} types
     * @return {Command}
     * @api public
     */

  }, {
    key: 'types',
    value: function types(_types) {
      var supported = ['string', 'boolean'];

      for (var item in _types) {
        if (supported.indexOf(item) === -1) {
          throw new Error('An invalid type was passed into command.types(): ' + item);
        }
        _types[item] = !_lodash2.default.isArray(_types[item]) ? [_types[item]] : _types[item];
      }
      this._types = _types;
      return this;
    }

    /**
     * Defines an alias for a given command.
     *
     * @param {String} alias
     * @return {Command}
     * @api public
     */

  }, {
    key: 'alias',
    value: function alias() {
      var _arguments2 = arguments,
          _this3 = this;

      var _loop = function _loop(i) {
        var alias = _arguments2[i];

        if (_lodash2.default.isArray(alias)) {
          for (j = 0; j < alias.length; ++j) {
            _this3.alias(alias[j]);
          }
          return {
            v: _this3
          };
        }

        _this3._parent.commands.forEach(function (cmd) {
          if (!_lodash2.default.isEmpty(cmd._aliases)) {
            if (_lodash2.default.includes(cmd._aliases, alias)) {
              var msg = 'Duplicate alias "' + alias + '" for command "' + this._name + '" detected. Was first reserved by command "' + cmd._name + '".';
              throw new Error(msg);
            }
          }
        });

        _this3._aliases.push(alias);
      };

      for (var i = 0; i < arguments.length; ++i) {
        var j;

        var _ret2 = _loop(i);

        if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
      }

      return this;
    }

    /**
     * Defines description for given command.
     *
     * @param {String} str
     * @return {Command}
     * @api public
     */

  }, {
    key: 'description',
    value: function description(str) {
      var isGetter = arguments.length === 0;

      if (!isGetter) {
        this._description = str;
      }

      return isGetter ? this._description : this;
    }

    /**
     * Removes self from Vorpal instance.
     *
     * @return {Command}
     * @api public
     */

  }, {
    key: 'remove',
    value: function remove() {
      var _this4 = this;

      this._parent.commands = _lodash2.default.reject(this._parent.commands, function (command) {
        return command._name === _this4._name;
      });

      return this;
    }

    /**
     * Returns the commands arguments as string.
     *
     * @param {String} desc
     * @return {String}
     * @api public
     */

  }, {
    key: 'arguments',
    value: function _arguments(desc) {
      return this._parseExpectedArgs(desc.split(/ +/));
    }

    /**
     * Returns the help info for given command.
     *
     * @return {String}
     * @api public
     */

  }, {
    key: 'helpInformation',
    value: function helpInformation() {
      var desc = [];
      var cmdName = this._name;
      var alias = '';

      if (this._description) {
        desc = ['  ' + this._description, ''];
      }

      if (this._aliases.length > 0) {
        alias = '  Alias: ' + this._aliases.join(' | ') + '\n';
      }
      var usage = ['', '  Usage: ' + cmdName + ' ' + this.usage(), ''];

      var cmds = [];

      var help = String(this.optionHelp().replace(/^/gm, '    '));
      var options = ['  Options:', '', help, ''];

      var res = usage.concat(cmds).concat(alias).concat(desc).concat(options).join('\n');

      res = res.replace(/\n\n\n/g, '\n\n');

      return res;
    }

    /**
     * Doesn't show command in the help menu.
     *
     * @return {Command}
     * @api public
     */

  }, {
    key: 'hidden',
    value: function hidden() {
      this._hidden = true;
      return this;
    }

    /**
     * Allows undeclared options to be passed in with the command.
     *
     * @param {Boolean} [allowUnknownOptions=true]
     * @return {Command}
     * @api public
     */

  }, {
    key: 'allowUnknownOptions',
    value: function allowUnknownOptions() {
      var _allowUnknownOptions = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      _allowUnknownOptions = _allowUnknownOptions === 'false' ? false : _allowUnknownOptions;

      this._allowUnknownOptions = !!_allowUnknownOptions;
      return this;
    }

    /**
     * Returns the command usage string for help.
     *
     * @param {String} str
     * @return {String}
     * @api public
     */

  }, {
    key: 'usage',
    value: function usage(str) {
      var args = this._args.map(function (arg) {
        return _util2.default.humanReadableArgName(arg);
      });

      var usage = '[options]' + (this.commands.length ? ' [command]' : '') + (this._args.length ? ' ' + args.join(' ') : '');

      var isGetter = arguments.length === 0;

      if (!isGetter) {
        this._usage = str;
      }

      return isGetter ? this._usage || usage : this;
    }

    /**
     * Returns the help string for the command's options.
     *
     * @return {String}
     * @api public
     */

  }, {
    key: 'optionHelp',
    value: function optionHelp() {
      var width = this._largestOptionLength();

      // Prepend the help information
      return [_util2.default.pad('--help', width) + '  output usage information'].concat(this.options.map(function (option) {
        return _util2.default.pad(option.flags, width) + '  ' + option.description;
      })).join('\n');
    }

    /**
     * Returns the length of the longest option.
     *
     * @return {Integer}
     * @api private
     */

  }, {
    key: '_largestOptionLength',
    value: function _largestOptionLength() {
      return this.options.reduce(function (max, option) {
        return Math.max(max, option.flags.length);
      }, 0);
    }

    /**
     * Adds a custom handling for the --help flag.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'help',
    value: function help(fn) {
      if (_lodash2.default.isFunction(fn)) {
        this._help = fn;
      }
      return this;
    }

    /**
     * Edits the raw command string before it
     * is executed.
     *
     * @param {String} str
     * @return {String} str
     * @api public
     */

  }, {
    key: 'parse',
    value: function parse(fn) {
      if (_lodash2.default.isFunction(fn)) {
        this._parse = fn;
      }
      return this;
    }

    /**
     * Adds a command to be executed after command completion.
     *
     * @param {Function} fn
     * @return {Command}
     * @api public
     */

  }, {
    key: 'after',
    value: function after(fn) {
      if (_lodash2.default.isFunction(fn)) {
        this._after = fn;
      }
      return this;
    }

    /**
     * Parses and returns expected command arguments.
     *
     * @param {String} args
     * @return {Array}
     * @api private
     */

  }, {
    key: '_parseExpectedArgs',
    value: function _parseExpectedArgs(args) {
      var _this5 = this;

      if (!args.length) {
        return;
      }

      args.forEach(function (arg) {
        var argDetails = {
          required: false,
          name: '',
          variadic: false
        };

        switch (arg[0]) {
          case '<':
            argDetails.required = true;
            argDetails.name = arg.slice(1, -1);
            break;
          case '[':
            argDetails.name = arg.slice(1, -1);
            break;
          default:
            break;
        }

        if (argDetails.name.length > 3 && argDetails.name.slice(-3) === '...') {
          argDetails.variadic = true;
          argDetails.name = argDetails.name.slice(0, -3);
        }
        if (argDetails.name) {
          _this5._args.push(argDetails);
        }
      });

      // If the user entered args in a weird order,
      // properly sequence them.
      if (this._args.length > 1) {
        this._args = this._args.sort(function (argu1, argu2) {
          if (argu1.required && !argu2.required) {
            return -1;
          } else if (argu2.required && !argu1.required) {
            return 1;
          } else if (argu1.variadic && !argu2.variadic) {
            return 1;
          } else if (argu2.variadic && !argu1.variadic) {
            return -1;
          }
          return 0;
        });
      }

      return;
    }
  }]);

  return Command;
}(_events.EventEmitter);