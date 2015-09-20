"use strict";

/**
 * Module dependencies.
 */

var EventEmitter = require("events").EventEmitter
  , os = require("os")
  , _ = require("lodash")
  , util = require('./util')
  ;

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
  this.parent = options.parent || void 0;
  this.authenticating = options.authenticating || false;
  this.authenticated = options.authenticated || void 0;
  this.user = options.user || "guest";
  this.host = options.host;
  this.address = options.address || void 0;
  this._isLocal = options.local || void 0;
  this._delimiter = options.delimiter || String(os.hostname()).split(".")[0] + "~$";
  this._modeDelimiter = void 0;

  // Keeps history of how many times in a row `tab` was
  // pressed on the keyboard.
  this._tabCtr = 0;

  // Prompt Command History
  // Histctr moves based on number of times "up" (+= ctr)
  //  or "down" (-= ctr) was pressed in traversing
  // command history.
  this._hist = [];
  this._histCtr = 0;

  // When in a "mode", we reset the
  // history and store it in a cache until
  // exiting the "mode", at which point we
  // resume the original history.
  this._histCache = [];
  this._histCtrCache = 0;

  // Special command mode vorpal is in at the moment,
  // such as REPL. See mode documentation.
  this._mode = void 0;

  return this;
}

/**
 * Session prototype.
 */

var session = Session.prototype;

/**
 * Expose `Session`.
 */

module.exports = exports = Session;

/**
 * Extend Session prototype as an event emitter.
 */

Session.prototype.__proto__ = EventEmitter.prototype;

/**
 * Pipes logging data through any piped
 * commands, and then sends it to ._log for
 * actual logging.
 *
 * @param {String} [... arguments]
 * @return {Session}
 * @api public
 */

session.log = function() {
	var self = this;
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

session._log = function() {
  var self = this;
  if (this.isLocal()) {
    this.parent.ui.log.apply(this.parent.ui, arguments);
  } else {
    // If it"s an error, expose the stack. Otherwise
    // we get a helpful "{}".
    var args = [];
    for (var i = 0; i < arguments.length; ++i) {
      var str = arguments[i];
      str = (str && str.stack) ? "Error: " + str.message : str;
      args.push(str);
    }
    self.parent._send("vantage-ssn-stdout-downstream", "downstream", { sessionId: self.id, value: args });
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

session.isLocal = function() {
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

session.prompt = function(options, cb) {
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

session.fullDelimiter = function() {
  var result = this._delimiter
   + ((this._modeDelimiter !== undefined) ? this._modeDelimiter : "");
  return result;
};

/**
 * Sets the delimiter for this session.
 *
 * @param {String} str
 * @return {Session}
 * @api public
 */

session.delimiter = function(str) {
  if (str === undefined) {
    return this._delimiter;
  } else {
    this._delimiter = String(str).trim() + " ";
    if (this.isLocal()) {
      this.parent.ui.refresh();
    } else {
      this.parent._send("vantage-delimiter-downstream", "downstream", { value: str, sessionId: this.id });
    }
    return this;
  }
};

/**
 * Sets the mode delimiter for this session.
 *
 * @param {String} str
 * @return {Session}
 * @api public
 */

session.modeDelimiter = function(str) {
  var self = this;
  if (str === undefined) {
    return this._modeDelimiter;
  } else {
    if (!this.isLocal()) {
      self.parent._send("vantage-mode-delimiter-downstream", "downstream", { value: str, sessionId: self.id });
    } else {
      if (str === false || str === "false") {
        this._modeDelimiter = void 0;
      } else {
        this._modeDelimiter = String(str).trim() + " ";
      }
      this.parent.ui.refresh();
    }
    return this;
  }
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

session.getKeypressResult = function(key, value, cb) {
  cb = cb || function() {};
  var keyMatch = (["up", "down", "tab"].indexOf(key) > -1);
  if (key !== "tab") {
    this._tabCtr = 0;
  }
  if (keyMatch) {
    if (["up", "down"].indexOf(key) > -1) {
      cb(void 0, this.getHistory(key));
    } else if (key === "tab") {
      this.getAutocomplete(value, function(err, data) {
        cb(err, data);
      });
    }
  } else {
    this._histCtr = 0;
  }
};

session.history = function(str) {
  var exceptions = [];
  if (str && exceptions.indexOf(String(str).toLowerCase()) === -1) {
    this._hist.push(str);
  }
};

/**
 * Handles tab-completion. Takes a partial
 * string as "he" and fills it in to "help", etc.
 * Works the same as a linux terminal"s auto-complete.
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

session.getAutocomplete = function(str, cb) {
  cb = cb || function() {};
  var typed = String(str);
  var names = _.pluck(this.parent.commands, "_name");

  var match = void 0;
  var extra = void 0;
  names.forEach(function(name){
    if (typed.substr(0, name.length) === name) {
      match = name;
      extra = typed.substr(name.length, typed.length);
    }
  });


  var command = (match)
    ? _.findWhere(this.parent.commands, { _name: match })
    : void 0;

  if (!command) {
    command = _.findWhere(this.parent.commands, { _catch: true });
  }

  if (command && _.isFunction(command._autocompletion)) {
    this._tabCtr++;
    command._autocompletion.call(this, extra, this._tabCtr, cb);
  } else {
    var result = this._autocomplete(str, names);
    cb(void 0, result);
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

session._autocomplete = function(str, arr) {
  arr.sort();
  var arrX = _.clone(arr);
  var strX = String(str);

  var go = function() {
    var matches = [];
    for (var i = 0; i < arrX.length; i++) {
      if (arrX[i].slice(0, strX.length).toLowerCase() === strX.toLowerCase()) {
        matches.push(arrX[i]);
      }
    }
    if (matches.length === 1) {
      return matches[0] + " ";
    } else if (matches.length === 0) {
      return void 0;
    } else {
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
      } else {
        return void 0;
      }
    }
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

session.help = function(command) {
  this.log(this.parent._commandHelp(command || ""));
};

/**
 * Public facing autocomplete helper.
 *
 * @param {String} str
 * @param {Array} arr
 * @return {String}
 * @api public
 */

session.match = function(str, arr) {
  return this._autocomplete(str, arr);
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

session.registerCommand = function() {
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

session.completeCommand = function(str, arr) {
  this._registeredCommands = this._registeredCommands || 0;
  this._completedCommands = this._completedCommands || 0;
  if (this._registeredCommands === this._completedCommands) {

  }
  return this;
};

/**
 * Returns the appropriate command history
 * string based on an "Up" or "Down" arrow
 * key pressed by the user.
 *
 * @param {String} direction
 * @return {String}
 * @api private
 */

session.getHistory = function(direction) {
  if (direction === "up") {
    this._histCtr++;
    this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
  } else if (direction === "down") {
    this._histCtr--;
    this._histCtr = (this._histCtr < 1) ? 1 : this._histCtr;
  }
  return this._hist[this._hist.length - (this._histCtr)];
};

/**
 * Generates random GUID for Session ID.
 *
 * @return {GUID}
 * @api private
 */

session._guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
    s4() + "-" + s4() + s4() + s4();
};
