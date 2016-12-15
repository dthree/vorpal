'use strict';

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var Option = require('./option');
var VorpalUtil = require('./util');
var _ = require('lodash');

/**
 * Command prototype.
 */

var command = Command.prototype;

/**
 * Expose `Command`.
 */

module.exports = exports = Command;

/**
 * Initialize a new `Command` instance.
 *
 * @param {String} name
 * @param {Vorpal} parent
 * @return {Command}
 * @api public
 */

function Command(name, parent) {
  if (!(this instanceof Command)) {
    return new Command();
  }
  this.commands = [];
  this.options = [];
  this._args = [];
  this._aliases = [];
  this._name = name;
  this._relay = false;
  this._hidden = false;
  this._parent = parent;
  this._mode = false;
  this._catch = false;
  this._help = undefined;
  this._init = undefined;
  this._after = undefined;
  this._allowUnknownOptions = false;
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

command.option = function (flags, description, autocomplete) {
  var self = this;
  var option = new Option(flags, description, autocomplete);
  var oname = option.name();
  var name = _camelcase(oname);
  var defaultValue;

  // preassign default value only for --no-*, [optional], or <required>
  if (option.bool === false || option.optional || option.required) {
    // when --no-* we make sure default is true
    if (option.bool === false) {
      defaultValue = true;
    }
    // preassign only if we have a default
    if (defaultValue !== undefined) {
      self[name] = defaultValue;
    }
  }

  // register the option
  this.options.push(option);

  // when it's passed assign the value
  // and conditionally invoke the callback
  this.on(oname, function (val) {
    // unassigned or bool
    if (typeof self[name] === 'boolean' || typeof self[name] === 'undefined') {
      // if no value, bool true, and we have a default, then use it!
      if (val === null) {
        self[name] = option.bool ? defaultValue || true : false;
      } else {
        self[name] = val;
      }
    } else if (val !== null) {
      // reassign
      self[name] = val;
    }
  });

  return this;
};

/**
 * Defines an action for a given command.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.action = function (fn) {
  var self = this;
  self._fn = fn;
  return this;
};

/**
 * Let's you compose other funtions to extend the command.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.use = function (fn) {
  return fn(this);
};

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
command.validate = function (fn) {
  var self = this;
  self._validate = fn;
  return this;
};

/**
 * Defines a function to be called when the
 * command is canceled.
 *
 * @param fn
 * @returns {Command}
 * @api public
 */
command.cancel = function (fn) {
  this._cancel = fn;
  return this;
};

/**
 * Defines a method to be called when
 * the command set has completed.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.done = function (fn) {
  this._done = fn;
  return this;
};

/**
 * Defines tabbed auto-completion
 * for the given command. Favored over
 * deprecated command.autocompletion.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.autocomplete = function (obj) {
  this._autocomplete = obj;
  return this;
};

/**
 * Defines tabbed auto-completion rules
 * for the given command.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.autocompletion = function (param) {
  this._parent._useDeprecatedAutocompletion = true;
  if (!_.isFunction(param) && !_.isObject(param)) {
    throw new Error('An invalid object type was passed into the first parameter of command.autocompletion: function expected.');
  }

  this._autocompletion = param;
  return this;
};

/**
 * Defines an init action for a mode command.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.init = function (fn) {
  var self = this;
  if (self._mode !== true) {
    throw Error('Cannot call init from a non-mode action.');
  }
  self._init = fn;
  return this;
};

/**
 * Defines a prompt delimiter for a
 * mode once entered.
 *
 * @param {String} delimiter
 * @return {Command}
 * @api public
 */

command.delimiter = function (delimiter) {
  this._delimiter = delimiter;
  return this;
};

/**
 * Sets args for static typing of options
 * using minimist.
 *
 * @param {Object} types
 * @return {Command}
 * @api public
 */

command.types = function (types) {
  var supported = ['string', 'boolean'];
  for (var item in types) {
    if (supported.indexOf(item) === -1) {
      throw new Error('An invalid type was passed into command.types(): ' + item);
    }
    types[item] = !_.isArray(types[item]) ? [types[item]] : types[item];
  }
  this._types = types;
  return this;
};

/**
 * Defines an alias for a given command.
 *
 * @param {String} alias
 * @return {Command}
 * @api public
 */

command.alias = function () {
  var self = this;
  for (var i = 0; i < arguments.length; ++i) {
    var alias = arguments[i];
    if (_.isArray(alias)) {
      for (var j = 0; j < alias.length; ++j) {
        this.alias(alias[j]);
      }
      return this;
    }
    this._parent.commands.forEach(function (cmd) {
      if (!_.isEmpty(cmd._aliases)) {
        if (_.includes(cmd._aliases, alias)) {
          var msg = 'Duplicate alias "' + alias + '" for command "' + self._name + '" detected. Was first reserved by command "' + cmd._name + '".';
          throw new Error(msg);
        }
      }
    });
    this._aliases.push(alias);
  }
  return this;
};

/**
 * Defines description for given command.
 *
 * @param {String} str
 * @return {Command}
 * @api public
 */

command.description = function (str) {
  if (arguments.length === 0) {
    return this._description;
  }
  this._description = str;
  return this;
};

/**
 * Removes self from Vorpal instance.
 *
 * @return {Command}
 * @api public
 */

command.remove = function () {
  var self = this;
  this._parent.commands = _.reject(this._parent.commands, function (command) {
    if (command._name === self._name) {
      return true;
    }
  });
  return this;
};

/**
 * Returns the commands arguments as string.
 *
 * @param {String} desc
 * @return {String}
 * @api public
 */

command.arguments = function (desc) {
  return this._parseExpectedArgs(desc.split(/ +/));
};

/**
 * Returns the help info for given command.
 *
 * @return {String}
 * @api public
 */

command.helpInformation = function () {
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
};

/**
 * Doesn't show command in the help menu.
 *
 * @return {Command}
 * @api public
 */

command.hidden = function () {
  this._hidden = true;
  return this;
};

/**
 * Allows undeclared options to be passed in with the command.
 *
 * @param {Boolean} [allowUnknownOptions=true]
 * @return {Command}
 * @api public
 */

command.allowUnknownOptions = function () {
  var allowUnknownOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

  allowUnknownOptions = allowUnknownOptions === "false" ? false : allowUnknownOptions;

  this._allowUnknownOptions = !!allowUnknownOptions;
  return this;
};

/**
 * Returns the command usage string for help.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

command.usage = function (str) {
  var args = this._args.map(function (arg) {
    return VorpalUtil.humanReadableArgName(arg);
  });

  var usage = '[options]' + (this.commands.length ? ' [command]' : '') + (this._args.length ? ' ' + args.join(' ') : '');

  if (arguments.length === 0) {
    return this._usage || usage;
  }

  this._usage = str;

  return this;
};

/**
 * Returns the help string for the command's options.
 *
 * @return {String}
 * @api public
 */

command.optionHelp = function () {
  var width = this._largestOptionLength();

  // Prepend the help information
  return [VorpalUtil.pad('--help', width) + '  output usage information'].concat(this.options.map(function (option) {
    return VorpalUtil.pad(option.flags, width) + '  ' + option.description;
  })).join('\n');
};

/**
 * Returns the length of the longest option.
 *
 * @return {Integer}
 * @api private
 */

command._largestOptionLength = function () {
  return this.options.reduce(function (max, option) {
    return Math.max(max, option.flags.length);
  }, 0);
};

/**
 * Adds a custom handling for the --help flag.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.help = function (fn) {
  if (_.isFunction(fn)) {
    this._help = fn;
  }
  return this;
};

/**
 * Edits the raw command string before it
 * is executed.
 *
 * @param {String} str
 * @return {String} str
 * @api public
 */

command.parse = function (fn) {
  if (_.isFunction(fn)) {
    this._parse = fn;
  }
  return this;
};

/**
 * Adds a command to be executed after command completion.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.after = function (fn) {
  if (_.isFunction(fn)) {
    this._after = fn;
  }
  return this;
};

/**
 * Parses and returns expected command arguments.
 *
 * @param {String} args
 * @return {Array}
 * @api private
 */

command._parseExpectedArgs = function (args) {
  if (!args.length) {
    return;
  }
  var self = this;
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
      self._args.push(argDetails);
    }
  });

  // If the user entered args in a weird order,
  // properly sequence them.
  if (self._args.length > 1) {
    self._args = self._args.sort(function (argu1, argu2) {
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
};

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

/**
 * Make command an EventEmitter.
 */

command.__proto__ = EventEmitter.prototype;