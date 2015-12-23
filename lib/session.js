'use strict';

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var os = require('os');
var _ = require('lodash');
var util = require('./util');
var CommandInstance = require('./command-instance');

/**
 * Initialize a new `Session` instance.
 *
 * @param {String} name
 * @return {Session}
 * @api public
 */

function Session(options) {
  options = options || {};
  this.id = options.id || this._guid();
  this.parent = options.parent || undefined;
  this.authenticating = options.authenticating || false;
  this.authenticated = options.authenticated || undefined;
  this.user = options.user || 'guest';
  this.host = options.host;
  this.address = options.address || undefined;
  this._isLocal = options.local || undefined;
  this._delimiter = options.delimiter || String(os.hostname()).split('.')[0] + '~$';
  this._modeDelimiter = undefined;

  // Keeps history of how many times in a row `tab` was
  // pressed on the keyboard.
  this._tabCtr = 0;

  this.cmdHistory = this.parent.cmdHistory;

  // Initialize command history
  this.cmdHistory.init();

  // Special command mode vorpal is in at the moment,
  // such as REPL. See mode documentation.
  this._mode = undefined;

  return this;
}

/**
 * Extend Session prototype as an event emitter.
 */

Session.prototype = Object.create(EventEmitter.prototype);

/**
 * Session prototype.
 */

var session = Session.prototype;

/**
 * Expose `Session`.
 */

module.exports = exports = Session;

/**
 * Pipes logging data through any piped
 * commands, and then sends it to ._log for
 * actual logging.
 *
 * @param {String} [... arguments]
 * @return {Session}
 * @api public
 */

session.log = function () {
  var args = util.fixArgsForApply(arguments);
  return this._log.apply(this, args);
};

/**
 * Routes logging for a given session.
 * is on a local TTY, or remote.
 *
 * @param {String} [... arguments]
 * @return {Session}
 * @api public
 */

session._log = function () {
  var self = this;
  if (this.isLocal()) {
    this.parent.ui.log.apply(this.parent.ui, arguments);
  } else {
    // If it's an error, expose the stack. Otherwise
    // we get a helpful '{}'.
    var args = [];
    for (var i = 0; i < arguments.length; ++i) {
      var str = arguments[i];
      str = (str && str.stack) ? 'Error: ' + str.message : str;
      args.push(str);
    }
    self.parent._send('vantage-ssn-stdout-downstream', 'downstream', {sessionId: self.id, value: args});
  }
  return this;
};

/**
 * Returns whether given session
 * is on a local TTY, or remote.
 *
 * @return {Boolean}
 * @api public
 */

session.isLocal = function () {
  return this._isLocal;
};

/**
 * Maps to vorpal.prompt for a session
 * context.
 *
 * @param {Object} options
 * @param {Function} cb
 * @api public
 */

session.prompt = function (options, cb) {
  options = options || {};
  options.sessionId = this.id;
  return this.parent.prompt(options, cb);
};

/**
 * Gets the full (normal + mode) delimiter
 * for this session.
 *
 * @return {String}
 * @api public
 */

session.fullDelimiter = function () {
  var result = this._delimiter +
   ((this._modeDelimiter !== undefined) ? this._modeDelimiter : '');
  return result;
};

/**
 * Sets the delimiter for this session.
 *
 * @param {String} str
 * @return {Session}
 * @api public
 */

session.delimiter = function (str) {
  if (str === undefined) {
    return this._delimiter;
  }
  this._delimiter = String(str).trim() + ' ';
  if (this.isLocal()) {
    this.parent.ui.refresh();
  } else {
    this.parent._send('vantage-delimiter-downstream', 'downstream', {value: str, sessionId: this.id});
  }
  return this;
};

/**
 * Sets the mode delimiter for this session.
 *
 * @param {String} str
 * @return {Session}
 * @api public
 */

session.modeDelimiter = function (str) {
  var self = this;
  if (str === undefined) {
    return this._modeDelimiter;
  }
  if (!this.isLocal()) {
    self.parent._send('vantage-mode-delimiter-downstream', 'downstream', {value: str, sessionId: self.id});
  } else {
    if (str === false || str === 'false') {
      this._modeDelimiter = undefined;
    } else {
      this._modeDelimiter = String(str).trim() + ' ';
    }
    this.parent.ui.refresh();
  }
  return this;
};

/**
 * Returns the result of a keypress
 * string, depending on the type.
 *
 * @param {String} key
 * @param {String} value
 * @return {Function}
 * @api private
 */

session.getKeypressResult = function (key, value, cb) {
  cb = cb || function () {};
  var keyMatch = (['up', 'down', 'tab'].indexOf(key) > -1);
  if (key !== 'tab') {
    this._tabCtr = 0;
  }
  if (keyMatch) {
    if (['up', 'down'].indexOf(key) > -1) {
      cb(undefined, this.getHistory(key));
    } else if (key === 'tab') {
      this.getAutocomplete(value, function (err, data) {
        cb(err, data);
      });
    }
  } else {
    this._histCtr = 0;
  }
};

session.history = function (str) {
  var exceptions = [];
  if (str && exceptions.indexOf(String(str).toLowerCase()) === -1) {
    this.cmdHistory.newCommand(str);
  }
};

/**
 * Handles tab-completion. Takes a partial
 * string as 'he' and fills it in to 'help', etc.
 * Works the same as a linux terminal's auto-complete.
 *
 * If the user has typed beyond than a listed command,
 * it will look up that command and check if it has
 * an `autocompletion` function, and will return
 * that instead.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

session.getAutocomplete = function (str, cb) {
  cb = cb || function () {};

  // Entire command string
  var cursor = this.parent.ui._activePrompt.screen.rl.cursor;
  var trimmed = String(str).trim();
  var cut = String(trimmed).slice(0, cursor);
  var remainder = String(trimmed).slice(cursor, trimmed.length).replace(/ +$/, '');
  trimmed = cut;

  // Set "trimmed" to command string after pipe
  // Set "pre" to command string, pipe, and a space
  var pre = '';
  var lastPipeIndex = trimmed.lastIndexOf('|');
  if (lastPipeIndex !== -1) {
    pre = trimmed.substr(0, lastPipeIndex + 1) + ' ';
    trimmed = trimmed.substr(lastPipeIndex + 1).trim();
  }

  // Complete command
  var names = _.pluck(this.parent.commands, '_name');
  var result = this._autocomplete(trimmed, names);
  if (result && trimmed.length < String(result).trim().length) {
    cb(undefined, pre + result + remainder);
    return;
  }

  // Find custom autocompletion
  var match;
  var extra;

  names.forEach(function (name) {
    if (trimmed.substr(0, name.length) === name && String(name).trim() !== '') {
      match = name;
      extra = trimmed.substr(name.length).trim();
    }
  });

  var command = (match) ?
    _.findWhere(this.parent.commands, {_name: match}) :
    undefined;

  if (!command) {
    command = _.findWhere(this.parent.commands, {_catch: true});
    if (command) {
      extra = trimmed;
    }
  }

  if (command && _.isFunction(command._autocompletion)) {
    this._tabCtr++;
    command._autocompletion.call(this, extra, this._tabCtr, function (err, autocomplete) {
      if (err) {
        return cb(err);
      }
      if (_.isArray(autocomplete)) {
        return cb(undefined, autocomplete);
      } else if (autocomplete === undefined) {
        return cb(undefined, undefined);
      }
      return cb(undefined, pre + autocomplete + remainder);
    });
  } else {
    cb(undefined, undefined);
  }
};

/**
 * Independent / stateless auto-complete function.
 * Parses an array of strings for the best match.
 *
 * @param {String} str
 * @param {Array} arr
 * @return {String}
 * @api private
 */

session._autocomplete = function (str, arr) {
  arr.sort();
  var arrX = _.clone(arr);
  var strX = String(str);

  var go = function () {
    var matches = [];
    for (var i = 0; i < arrX.length; i++) {
      if (arrX[i].slice(0, strX.length).toLowerCase() === strX.toLowerCase()) {
        matches.push(arrX[i]);
      }
    }
    if (matches.length === 1) {
      return matches[0] + ' ';
    } else if (matches.length === 0) {
      return undefined;
    }
    var furthest = strX;
    for (var k = strX.length; k < matches[0].length; ++k) {
      var curr = String(matches[0].slice(0, k)).toLowerCase();
      var same = 0;
      for (var j = 0; j < matches.length; ++j) {
        var sliced = String(matches[j].slice(0, curr.length)).toLowerCase();
        if (sliced === curr) {
          same++;
        }
      }
      if (same === matches.length) {
        furthest = curr;
        continue;
      } else {
        break;
      }
    }
    if (furthest !== strX) {
      return furthest;
    }
    return undefined;
  };
  return go();
};

/**
 * Public facing autocomplete helper.
 *
 * @param {String} str
 * @param {Array} arr
 * @return {String}
 * @api public
 */

session.help = function (command) {
  this.log(this.parent._commandHelp(command || ''));
};

/**
 * Public facing autocomplete helper.
 *
 * @param {String} str
 * @param {Array} arr
 * @return {String}
 * @api public
 */

session.match = function (str, arr) {
  return this._autocomplete(str, arr);
};

/**
 * Gets a new command set ready.
 *
 * @return {session}
 * @api public
 */

session.execCommandSet = function (wrapper, callback) {
  var self = this;
  var response = {};
  var cbk = callback;
  this._registeredCommands = 1;
  this._completedCommands = 0;

  // Create the command instance for the first
  // command and hook it up to the pipe chain.
  var commandInstance = new CommandInstance({
    downstream: wrapper.pipes[0],
    commandObject: wrapper.commandObject,
    commandWrapper: wrapper
  });

  wrapper.commandInstance = commandInstance;

  function sendDones(itm) {
    if (itm.commandObject && itm.commandObject._done) {
      itm.commandObject._done.call(itm);
    }
    if (itm.downstream) {
      sendDones(itm.downstream);
    }
  }

  // Gracefully handles all instances of the command completing.
  this._commandSetCallback = function () {
    var err = response.error;
    var data = response.data;
    var argus = response.args;
    if (self.isLocal() && err) {
      var stack;
      if (data && data.stack) {
        stack = data.stack;
      } else if (err && err.stack) {
        stack = err.stack;
      } else {
        stack = err;
      }
      self.log(stack);
      self.parent.emit('client_command_error', {command: wrapper.command, error: err});
    } else if (self.isLocal()) {
      self.parent.emit('client_command_executed', {command: wrapper.command});
    }
    cbk(wrapper, err, data, argus);
    sendDones(commandInstance);
  };

  function onCompletion(wrapper, err, data, argus) {
    response = {
      error: err,
      data: data,
      args: argus
    };
    self.completeCommand();
  }

  if (_.isFunction(wrapper.validate)) {
    try {
      wrapper.validate(wrapper.args);
    } catch (e) {
      // Complete with error on validation error
      onCompletion(wrapper, e);
      return this;
    }
  }

  // Call the root command.
  var res = wrapper.fn.call(commandInstance, wrapper.args, function () {
    var argus = util.fixArgsForApply(arguments);
    onCompletion(wrapper, argus[0], argus[1], argus);
  });

  // If the command as declared by the user
  // returns a promise, handle accordingly.
  if (res && _.isFunction(res.then)) {
    res.then(function (data) {
      onCompletion(wrapper, undefined, data);
    }).catch(function (err) {
      onCompletion(wrapper, true, err);
    });
  }

  return this;
};

/**
 * Adds on a command or sub-command in progress.
 * Session keeps tracked of commands,
 * and as soon as all commands have been
 * compelted, the session returns the entire
 * command set as complete.
 *
 * @return {session}
 * @api public
 */

session.registerCommand = function () {
  this._registeredCommands = this._registeredCommands || 0;
  this._registeredCommands++;
  return this;
};

/**
 * Marks a command or subcommand as having completed.
 * If all commands have completed, calls back
 * to the root command as being done.
 *
 * @return {session}
 * @api public
 */

session.completeCommand = function () {
  this._completedCommands++;
  if (this._registeredCommands <= this._completedCommands) {
    this._registeredCommands = 0;
    this._completedCommands = 0;
    if (this._commandSetCallback) {
      this._commandSetCallback();
    }
    this._commandSetCallback = undefined;
  }
  return this;
};

/**
 * Returns the appropriate command history
 * string based on an 'Up' or 'Down' arrow
 * key pressed by the user.
 *
 * @param {String} direction
 * @return {String}
 * @api private
 */

session.getHistory = function (direction) {
  var history;
  if (direction === 'up') {
    history = this.cmdHistory.getPreviousHistory();
  } else if (direction === 'down') {
    history = this.cmdHistory.getNextHistory();
  }
  return history;
};

/**
 * Generates random GUID for Session ID.
 *
 * @return {GUID}
 * @api private
 */

session._guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};
