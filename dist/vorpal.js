'use strict';

/**
 * Polyfill for ES6.
 */

if (!global._babelPolyfill) {
  // When the runtime transformer properly detects all shimmed methods, use instead.
  // http://www.2ality.com/2015/12/babel6-helpersstandard-library.html#babel-plugin-transform-runtime
  require('babel-polyfill');
}

/**
 * Module dependencies.
 */

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Command = require('./command');
var CommandInstance = require('./command-instance');
var VorpalUtil = require('./util');
var ui = require('./ui');
var Session = require('./session');
var intercept = require('./intercept');
var minimist = require('minimist');
var commons = require('./vorpal-commons');
var chalk = require('chalk');
var os = require('os');
var History = require('./history');
var LocalStorage = require('./local-storage');
var wrap = require('wrap-ansi');

/**
 * Initialize a new `Vorpal` instance.
 *
 * @return {Vorpal}
 * @api public
 */

function Vorpal() {
  if (!(this instanceof Vorpal)) {
    return new Vorpal();
  }

  // Program version
  // Exposed through vorpal.version(str);
  this._version = '';

  // Command line history instance
  this.cmdHistory = new this.CmdHistoryExtension();

  // Registered `vorpal.command` commands and
  // their options.
  this.commands = [];

  // Queue of IP requests, executed async, in sync.
  this._queue = [];

  // Current command being executed.
  this._command = undefined;

  // Expose UI.
  this.ui = ui;

  // Expose chalk as a convenience.
  this.chalk = chalk;

  // Expose lodash as a convenience.
  this.lodash = _;

  // Exposed through vorpal.delimiter(str).
  this._delimiter = 'local@' + String(os.hostname()).split('.')[0] + '~$ ';
  ui.setDelimiter(this._delimiter);

  // Placeholder for vantage server. If vantage
  // is used, this will be over-written.
  this.server = {
    sessions: []
  };

  // Whether all stdout is being hooked through a function.
  this._hooked = false;

  this._useDeprecatedAutocompletion = false;

  // Expose common utilities, like padding.
  this.util = VorpalUtil;

  this.Session = Session;

  // Active vorpal server session.
  this.session = new this.Session({
    local: true,
    user: 'local',
    parent: this,
    delimiter: this._delimiter
  });

  // Allow unix-like key value pair normalization to be turned off by toggling this switch on.
  this.isCommandArgKeyPairNormalized = true;

  this._init();
  return this;
}

/**
 * Extend Vorpal prototype as an event emitter.
 */

Vorpal.prototype = Object.create(EventEmitter.prototype);

/**
 * Vorpal prototype.
 */

var vorpal = Vorpal.prototype;

/**
 * Expose `Vorpal`.
 */

exports = module.exports = Vorpal;

/**
 * Extension to `constructor`.
 * @api private
 */

Vorpal.prototype._init = function () {
  var self = this;

  ui.on('vorpal_ui_keypress', function (data) {
    self.emit('keypress', data);
    self._onKeypress(data.key, data.value);
  });

  self.use(commons);
};

/**
 * Parses `process.argv` and executes
 * a Vorpal command based on it.
 * @api public
 */

Vorpal.prototype.parse = function (argv, options) {
  options = options || {};
  var args = argv;
  var result = this;
  var catchExists = !(_.find(this.commands, { _catch: true }) === undefined);
  args.shift();
  args.shift();
  if (args.length > 0 || catchExists) {
    if (options.use === 'minimist') {
      result = minimist(args);
    } else {
      // Wrap the spaced args back in quotes.
      for (var i = 0; i < args.length; ++i) {
        if (i === 0) {
          continue;
        }
        if (args[i].indexOf(' ') > -1) {
          args[i] = '"' + args[i] + '"';
        }
      }
      ui.attach(result);
      this.exec(args.join(' '), function (err) {
        if (err !== undefined && err !== null) {
          throw new Error(err);
        }
      });
    }
  }
  return result;
};

/**
 * Sets version of your application's API.
 *
 * @param {String} version
 * @return {Vorpal}
 * @api public
 */

vorpal.version = function (version) {
  this._version = version;
  return this;
};

/**
 * Sets the permanent delimiter for this
 * Vorpal server instance.
 *
 * @param {String} str
 * @return {Vorpal}
 * @api public
 */

vorpal.delimiter = function (str) {
  this._delimiter = str;
  if (this.session.isLocal() && !this.session.client) {
    this.session.delimiter(str);
  }
  return this;
};

/**
 * Imports a library of Vorpal API commands
 * from another Node module as an extension
 * of Vorpal.
 *
 * @param {Array} commands
 * @return {Vorpal}
 * @api public
 */

vorpal.use = function (commands, options) {
  if (!commands) {
    return this;
  }
  if (_.isFunction(commands)) {
    commands.call(this, this, options);
  } else if (_.isString(commands)) {
    return this.use(require(commands), options);
  } else {
    commands = _.isArray(commands) ? commands : [commands];
    for (var i = 0; i < commands.length; ++i) {
      var cmd = commands[i];
      if (cmd.command) {
        var command = this.command(cmd.command);
        if (cmd.description) {
          command.description(cmd.description);
        }
        if (cmd.options) {
          cmd.options = _.isArray(cmd.options) ? cmd.options : [cmd.options];
          for (var j = 0; j < cmd.options.length; ++j) {
            command.option(cmd.options[j][0], cmd.options[j][1]);
          }
        }
        if (cmd.action) {
          command.action(cmd.action);
        }
      }
    }
  }
  return this;
};

/**
 * Registers a new command in the vorpal API.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command}
 * @api public
 */

vorpal.command = function (name, desc, opts) {
  opts = opts || {};
  name = String(name);

  var argsRegExp = /(\[[^\]]*\]|\<[^\>]*\>)/g;
  var args = [];
  var arg;

  while ((arg = argsRegExp.exec(name)) !== null) {
    args.push(arg[1]);
  }

  var cmdNameRegExp = /^([^\[\<]*)/;
  var cmdName = cmdNameRegExp.exec(name)[0].trim();

  var cmd = new Command(cmdName, this);

  if (desc) {
    cmd.description(desc);
    this.executables = true;
  }

  cmd._noHelp = Boolean(opts.noHelp);
  cmd._mode = opts.mode || false;
  cmd._catch = opts.catch || false;
  cmd._parseExpectedArgs(args);
  cmd.parent = this;

  var exists = false;
  for (var i = 0; i < this.commands.length; ++i) {
    exists = this.commands[i]._name === cmd._name ? true : exists;
    if (exists) {
      this.commands[i] = cmd;
      break;
    }
  }
  if (!exists) {
    this.commands.push(cmd);
  } else {
    console.warn(chalk.yellow('Warning: command named "' + name + '" was registered more than once.\nIf you intend to override a command, you should explicitly remove the first command with command.remove().'));
  }

  this.emit('command_registered', { command: cmd, name: name });

  return cmd;
};

/**
 * Registers a new 'mode' command in the vorpal API.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command}
 * @api public
 */

vorpal.mode = function (name, desc, opts) {
  return this.command(name, desc, _.extend(opts || {}, { mode: true }));
};

/**
 * Registers a 'catch' command in the vorpal API.
 * This is executed when no command matches are found.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command}
 * @api public
 */

vorpal.catch = function (name, desc, opts) {
  return this.command(name, desc, _.extend(opts || {}, { catch: true }));
};

/**
 * An alias to the `catch` command.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command}
 * @api public
 */

vorpal.default = function (name, desc, opts) {
  return this.command(name, desc, _.extend(opts || {}, { catch: true }));
};

/**
 * Delegates to ui.log.
 *
 * @param {String} log
 * @return {Vorpal}
 * @api public
 */

vorpal.log = function () {
  this.ui.log.apply(this.ui, arguments);
  return this;
};

/**
 * Intercepts all logging through `vorpal.log`
 * and runs it through the function declared by
 * `vorpal.pipe()`.
 *
 * @param {Function} fn
 * @return {Vorpal}
 * @api public
 */

vorpal.pipe = function (fn) {
  if (this.ui) {
    this.ui._pipeFn = fn;
  }
  return this;
};

/**
 * If Vorpal is the local terminal,
 * hook all stdout, through a fn.
 *
 * @return {Vorpal}
 * @api private
 */

vorpal.hook = function (fn) {
  if (fn !== undefined) {
    this._hook(fn);
  } else {
    this._unhook();
  }
  return this;
};

/**
 * Unhooks stdout capture.
 *
 * @return {Vorpal}
 * @api public
 */

vorpal._unhook = function () {
  if (this._hooked && this._unhook !== undefined) {
    this._unhook();
    this._hooked = false;
  }
  return this;
};

/**
 * Hooks all stdout through a given function.
 *
 * @param {Function} fn
 * @return {Vorpal}
 * @api public
 */

vorpal._hook = function (fn) {
  if (this._hooked && this._unhook !== undefined) {
    this._unhook();
  }
  this._unhook = intercept(fn);
  this._hooked = true;
  return this;
};

/**
 * History module used to get command history
 */
vorpal.CmdHistoryExtension = History;

/**
 * Set id for command line history
 * @param id
 * @return {Vorpal}
 * @api public
 */
vorpal.history = function (id) {
  this.cmdHistory.setId(id);
  return this;
};

/**
 * Set id for local storage
 * @param id
 * @return {Vorpal}
 * @api public
 */
vorpal.localStorage = function (id) {
  var ls = Object.create(LocalStorage);
  ls.setId(id);
  _.extend(this.localStorage, ls);
  return this;
};

/**
 * Set the path to where command line history is persisted.
 * Must be called before vorpal.history
 * @param path
 * @return {Vorpal}
 * @api public
 */
vorpal.historyStoragePath = function (path) {
  this.cmdHistory.setStoragePath(path);
  return this;
};

/**
 * Hook the tty prompt to this given instance
 * of vorpal.
 *
 * @return {Vorpal}
 * @api public
 */

vorpal.show = function () {
  ui.attach(this);
  return this;
};

/**
 * Disables the vorpal prompt on the
 * local terminal.
 *
 * @return {Vorpal}
 * @api public
 */

vorpal.hide = function () {
  ui.detach(this);
  return this;
};

/**
 * Listener for a UI keypress. Either
 * handles the keypress locally or sends
 * it upstream.
 *
 * @param {String} key
 * @param {String} value
 * @api private
 */

vorpal._onKeypress = function (key, value) {
  var self = this;
  if (this.session.isLocal() && !this.session.client && !this._command) {
    this.session.getKeypressResult(key, value, function (err, result) {
      if (!err && result !== undefined) {
        if (_.isArray(result)) {
          var formatted = VorpalUtil.prettifyArray(result);
          self.ui.imprint();
          self.session.log(formatted);
        } else {
          self.ui.input(result);
        }
      }
    });
  } else {
    this._send('vantage-keypress-upstream', 'upstream', {
      key: key,
      value: value,
      sessionId: this.session.id
    });
  }
};

/**
 * For use in vorpal API commands, sends
 * a prompt command downstream to the local
 * terminal. Executes a prompt and returns
 * the response upstream to the API command.
 *
 * @param {Object} options
 * @param {Function} userCallback
 * @return {Vorpal}
 * @api public
 */

vorpal.prompt = function () {
  var _this = this;

  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var userCallback = arguments[1];

  return new Promise(function (resolve) {
    // Setup callback to also resolve promise.
    var cb = function cb(response) {
      // Does not currently handle Inquirer validation errors.
      resolve(response);
      if (userCallback) {
        userCallback(response);
      }
    };

    var prompt = undefined;
    var ssn = _this.getSessionById(options.sessionId);

    if (!ssn) {
      throw new Error('Vorpal.prompt was called without a passed Session ID.');
    }

    var handler = function handler(data) {
      var response = data.value;
      _this.removeListener('vantage-prompt-upstream', handler);
      cb(response);
    };

    if (ssn.isLocal()) {
      ui.setDelimiter(options.message || ssn.delimiter());
      prompt = ui.prompt(options, function (result) {
        ui.setDelimiter(ssn.delimiter());
        cb(result);
      });
    } else {
      _this.on('vantage-prompt-upstream', handler);
      _this._send('vantage-prompt-downstream', 'downstream', { options: options, value: undefined, sessionId: ssn.id });
    }
    return prompt;
  });
};

/**
 * Renders the CLI prompt or sends the
 * request to do so downstream.
 *
 * @param {Object} data
 * @return {Vorpal}
 * @api private
 */

vorpal._prompt = function (data) {
  var self = this;
  var prompt;
  data = data || {};
  if (!data.sessionId) {
    data.sessionId = self.session.id;
  }
  var ssn = self.getSessionById(data.sessionId);

  // If we somehow got to _prompt and aren't the
  // local client, send the command downstream.
  if (!ssn.isLocal()) {
    this._send('vantage-resume-downstream', 'downstream', { sessionId: data.sessionId });
    return self;
  }

  if (ui.midPrompt()) {
    return self;
  }

  prompt = ui.prompt({
    type: 'input',
    name: 'command',
    message: ssn.fullDelimiter()
  }, function (result) {
    if (self.ui._cancelled === true) {
      self.ui._cancelled = false;return;
    }
    var str = String(result.command).trim();
    self.emit('client_prompt_submit', str);
    if (str === '' || str === 'undefined') {
      self._prompt(data);return;
    }
    self.exec(str, function () {
      self._prompt(data);
    });
  });

  return prompt;
};

/**
 * Executes a vorpal API command and
 * returns the response either through a
 * callback or Promise in the absence
 * of a callback.
 *
 * A little black magic here - because
 * we sometimes have to send commands 10
 * miles upstream through 80 other instances
 * of vorpal and we aren't going to send
 * the callback / promise with us on that
 * trip, we store the command, callback,
 * resolve and reject objects (as they apply)
 * in a local vorpal._command variable.
 *
 * When the command eventually comes back
 * downstream, we dig up the callbacks and
 * finally resolve or reject the promise, etc.
 *
 * Lastly, to add some more complexity, we throw
 * command and callbacks into a queue that will
 * be unearthed and sent in due time.
 *
 * @param {String} cmd
 * @param {Function} cb
 * @return {Promise or Vorpal}
 * @api public
 */

vorpal.exec = function (cmd, args, cb) {
  var self = this;
  var ssn = self.session;

  cb = _.isFunction(args) ? args : cb;
  args = args || {};

  if (args.sessionId) {
    ssn = self.getSessionById(args.sessionId);
  }

  var command = {
    command: cmd,
    args: args,
    callback: cb,
    session: ssn
  };

  if (cb !== undefined) {
    self._queue.push(command);
    self._queueHandler();
    return self;
  }

  return new Promise(function (resolve, reject) {
    command.resolve = resolve;
    command.reject = reject;
    self._queue.push(command);
    self._queueHandler();
  });
};

/**
 * Executes a Vorpal command in sync.
 *
 * @param {String} cmd
 * @param {Object} args
 * @return {*} stdout
 * @api public
 */

vorpal.execSync = function (cmd, options) {
  var self = this;
  var ssn = self.session;
  options = options || {};
  if (options.sessionId) {
    ssn = self.getSessionById(options.sessionId);
  }

  var command = {
    command: cmd,
    args: options,
    session: ssn,
    sync: true,
    options: options
  };

  return self._execQueueItem(command);
};

/**
 * Commands issued to Vorpal server
 * are executed in sequence. Called once
 * when a command is inserted or completes,
 * shifts the next command in the queue
 * and sends it to `vorpal._execQueueItem`.
 *
 * @api private
 */

vorpal._queueHandler = function () {
  if (this._queue.length > 0 && this._command === undefined) {
    var item = this._queue.shift();
    this._execQueueItem(item);
  }
};

/**
 * Fires off execution of a command - either
 * calling upstream or executing locally.
 *
 * @param {Object} cmd
 * @api private
 */

vorpal._execQueueItem = function (cmd) {
  var self = this;
  self._command = cmd;
  if (cmd.session.isLocal() && !cmd.session.client) {
    return this._exec(cmd);
  }
  self._send('vantage-command-upstream', 'upstream', {
    command: cmd.command,
    args: cmd.args,
    completed: false,
    sessionId: cmd.session.id
  });
};

/**
 * Executes a vorpal API command.
 * Warning: Dragons lie beyond this point.
 *
 * @param {String} item
 * @api private
 */

vorpal._exec = function (item) {
  var self = this;
  item = item || {};
  item.command = item.command || '';
  var modeCommand = item.command;
  item.command = item.session._mode ? item.session._mode : item.command;

  var promptCancelled = false;
  if (this.ui._midPrompt) {
    promptCancelled = true;
    this.ui.cancel();
  }

  if (!item.session) {
    throw new Error('Fatal Error: No session was passed into command for execution: ' + item);
  }

  if (String(item.command).indexOf('undefine') > -1) {
    throw new Error('vorpal._exec was called with an undefined command.');
  }

  // History for our 'up' and 'down' arrows.
  item.session.history(item.session._mode ? modeCommand : item.command);

  var commandData = this.util.parseCommand(item.command, this.commands);
  item.command = commandData.command;
  item.pipes = commandData.pipes;
  var match = commandData.match;
  var matchArgs = commandData.matchArgs;

  function throwHelp(cmd, msg, alternativeMatch) {
    if (msg) {
      cmd.session.log(msg);
    }
    var pickedMatch = alternativeMatch || match;
    cmd.session.log(pickedMatch.helpInformation());
  }

  function callback(cmd, err, msg, argus) {
    // Resume the prompt if we had to cancel
    // an active prompt, due to programmatic
    // execution.
    if (promptCancelled) {
      self._prompt();
    }
    if (cmd.sync) {
      // If we want the command to be fatal,
      // throw a real error. Otherwise, silently
      // return the error.
      delete self._command;
      if (err) {
        if (cmd.options && (cmd.options.fatal === true || vorpal._fatal === true)) {
          throw new Error(err);
        }
        return err;
      }
      return msg;
    } else if (cmd.callback) {
      if (argus) {
        cmd.callback.apply(self, argus);
      } else {
        cmd.callback.call(self, err, msg);
      }
    } else if (!err && cmd.resolve) {
      cmd.resolve(msg);
    } else if (err && cmd.reject) {
      cmd.reject(msg);
    }
    delete self._command;
    self._queueHandler();
  }

  if (match) {
    item.fn = match._fn;
    item._cancel = match._cancel;
    item.validate = match._validate;
    item.commandObject = match;
    var init = match._init || function (arrgs, cb) {
      cb();
    };
    var delimiter = match._delimiter || String(item.command).toLowerCase() + ':';

    item.args = self.util.buildCommandArgs(matchArgs, match, item, self.isCommandArgKeyPairNormalized);

    // If we get a string back, it's a validation error.
    // Show help and return.
    if (_.isString(item.args) || !_.isObject(item.args)) {
      throwHelp(item, item.args);
      return callback(item, undefined, item.args);
    }

    // Build the piped commands.
    var allValid = true;
    for (var j = 0; j < item.pipes.length; ++j) {
      var commandParts = self.util.matchCommand(item.pipes[j], self.commands);
      if (!commandParts.command) {
        item.session.log(self._commandHelp(item.pipes[j]));
        allValid = false;
        break;
      }
      commandParts.args = self.util.buildCommandArgs(commandParts.args, commandParts.command);
      if (_.isString(commandParts.args) || !_.isObject(commandParts.args)) {
        throwHelp(item, commandParts.args, commandParts.command);
        allValid = false;
        break;
      }
      item.pipes[j] = commandParts;
    }
    // If invalid piped commands, return.
    if (!allValid) {
      return callback(item);
    }

    // If `--help` or `/?` is passed, do help.
    if (item.args.options.help && _.isFunction(match._help)) {
      // If the command has a custom help function, run it
      // as the actual "command". In this way it can go through
      // the whole cycle and expect a callback.
      item.fn = match._help;
      delete item.validate;
      delete item._cancel;
    } else if (item.args.options.help) {
      // Otherwise, throw the standard help.
      throwHelp(item, '');
      return callback(item);
    }

    // If this command throws us into a 'mode',
    // prepare for it.
    if (match._mode === true && !item.session._mode) {
      // Assign vorpal to be in a 'mode'.
      item.session._mode = item.command;
      // Execute the mode's `init` function
      // instead of the `action` function.
      item.fn = init;
      delete item.validate;

      self.cmdHistory.enterMode();
      item.session.modeDelimiter(delimiter);
    } else if (item.session._mode) {
      if (String(modeCommand).trim() === 'exit') {
        self._exitMode({ sessionId: item.session.id });
        return callback(item);
      }
      // This executes when actually in a 'mode'
      // session. We now pass in the raw text of what
      // is typed into the first param of `action`
      // instead of arguments.
      item.args = modeCommand;
    }

    if (item.sync === true) {
      // If we're running synchronous commands,
      // we don't support piping.
      var response;
      var error;
      try {
        response = item.fn.call(new CommandInstance({
          downstream: undefined,
          commandWrapper: item,
          commandObject: item.commandObject,
          args: item.args
        }), item.args);
      } catch (e) {
        error = e;
      }
      return callback(item, error, response);
    }

    // Builds commandInstance objects for every
    // command and piped command included in the
    // execution string.

    // Build the instances for each pipe.
    item.pipes = item.pipes.map(function (pipe) {
      return new CommandInstance({
        commandWrapper: item,
        command: pipe.command._name,
        commandObject: pipe.command,
        args: pipe.args
      });
    });

    // Reverse through the pipes and assign the
    // `downstream` object of each parent to its
    // child command.
    for (var k = item.pipes.length - 1; k > -1; --k) {
      var downstream = item.pipes[k + 1];
      item.pipes[k].downstream = downstream;
    }

    item.session.execCommandSet(item, function (wrapper, err, data, argus) {
      callback(wrapper, err, data, argus);
    });
  } else {
    // If no command match, just return.
    item.session.log(this._commandHelp(item.command));
    return callback(item, undefined, 'Invalid command.');
  }
};

/**
 * Exits out of a give 'mode' one is in.
 * Reverts history and delimiter back to
 * regular vorpal usage.
 *
 * @api private
 */

vorpal._exitMode = function (options) {
  var ssn = this.getSessionById(options.sessionId);
  ssn._mode = false;
  this.cmdHistory.exitMode();
  ssn.modeDelimiter(false);
  this.emit('mode_exit', this.cmdHistory.peek());
};

/**
 * Registers a custom handler for SIGINT.
 * Vorpal exits with 0 by default
 * on a sigint.
 *
 * @param {Function} fn
 * @return {Vorpal}
 * @api public
 */

vorpal.sigint = function (fn) {
  if (_.isFunction(fn)) {
    ui.sigint(fn);
  } else {
    throw new Error('vorpal.sigint must be passed in a valid function.');
  }
  return this;
};

/**
 * Returns the instance of  given command.
 *
 * @param {String} cmd
 * @return {Command}
 * @api public
 */

vorpal.find = function (name) {
  return _.find(this.commands, { _name: name });
};

/**
 * Registers custom help.
 *
 * @param {Function} fn
 * @return {Vorpal}
 * @api public
 */

vorpal.help = function (fn) {
  this._help = fn;
};

/**
 * Returns help string for a given command.
 *
 * @param {String} command
 * @api private
 */

vorpal._commandHelp = function (command) {
  if (!this.commands.length) {
    return '';
  }

  if (this._help !== undefined && _.isFunction(this._help)) {
    return this._help(command);
  }

  var matches = [];
  var singleMatches = [];

  command = command ? String(command).trim().toLowerCase() : undefined;
  for (var i = 0; i < this.commands.length; ++i) {
    var parts = String(this.commands[i]._name).split(' ');
    if (parts.length === 1 && parts[0] === command && !this.commands[i]._hidden && !this.commands[i]._catch) {
      singleMatches.push(command);
    }
    var str = '';
    for (var j = 0; j < parts.length; ++j) {
      str = String(str + ' ' + parts[j]).trim();
      if (str === command && !this.commands[i]._hidden && !this.commands[i]._catch) {
        matches.push(this.commands[i]);
        break;
      }
    }
  }

  var invalidString = command && matches.length === 0 && singleMatches.length === 0 ? ['', '  Invalid Command. Showing Help:', ''].join('\n') : '';

  var commandMatch = matches.length > 0;
  var commandMatchLength = commandMatch ? String(command).trim().split(' ').length + 1 : 1;
  matches = matches.length === 0 ? this.commands : matches;

  var skipGroups = !(matches.length + 6 > process.stdout.rows);

  var commands = matches.filter(function (cmd) {
    return !cmd._noHelp;
  }).filter(function (cmd) {
    return !cmd._catch;
  }).filter(function (cmd) {
    return !cmd._hidden;
  }).filter(function (cmd) {
    if (skipGroups === true) {
      return true;
    }
    return String(cmd._name).trim().split(' ').length <= commandMatchLength;
  }).map(function (cmd) {
    var args = cmd._args.map(function (arg) {
      return VorpalUtil.humanReadableArgName(arg);
    }).join(' ');

    return [cmd._name + (cmd._alias ? '|' + cmd._alias : '') + (cmd.options.length ? ' [options]' : '') + ' ' + args, cmd.description() || ''];
  });

  var width = commands.reduce(function (max, commandX) {
    return Math.max(max, commandX[0].length);
  }, 0);

  var counts = {};

  var groups = _.uniq(matches.filter(function (cmd) {
    return String(cmd._name).trim().split(' ').length > commandMatchLength;
  }).map(function (cmd) {
    return String(cmd._name).split(' ').slice(0, commandMatchLength).join(' ');
  }).map(function (cmd) {
    counts[cmd] = counts[cmd] || 0;
    counts[cmd]++;
    return cmd;
  })).map(function (cmd) {
    var prefix = '    ' + VorpalUtil.pad(cmd + ' *', width) + '  ' + counts[cmd] + ' sub-command' + (counts[cmd] === 1 ? '' : 's') + '.';
    return prefix;
  });

  groups = skipGroups ? [] : groups;

  var descriptionWidth = process.stdout.columns - (width + 4);

  var commandsString = commands.length < 1 ? '' : '\n  Commands:\n\n' + commands.map(function (cmd) {
    var prefix = '    ' + VorpalUtil.pad(cmd[0], width) + '  ';
    var suffix = wrap(cmd[1], descriptionWidth - 8).split('\n');
    for (var _i = 0; _i < suffix.length; ++_i) {
      if (_i !== 0) {
        suffix[_i] = VorpalUtil.pad('', width + 6) + suffix[_i];
      }
    }
    suffix = suffix.join('\n');
    return prefix + suffix;
  }).join('\n') + '\n\n';

  var groupsString = groups.length < 1 ? '' : '  Command Groups:\n\n' + groups.join('\n') + '\n';

  var results = String(invalidString + commandsString + '\n' + groupsString).replace(/\n\n\n/g, '\n\n').replace(/\n\n$/, '\n');

  return results;
};

/**
 * Abstracts the logic for sending and
 * receiving sockets upstream and downstream.
 *
 * To do: Has the start of logic for vorpal sessions,
 * which I haven't fully confronted yet.
 *
 * @param {String} str
 * @param {String} direction
 * @param {String} data
 * @param {Object} options
 * @api private
 */

vorpal._send = function (str, direction, data, options) {
  options = options || {};
  data = data || {};
  var ssn = this.getSessionById(data.sessionId);
  if (!ssn) {
    throw new Error('No Sessions logged for ID ' + data.sessionId + ' in vorpal._send.');
  }
  if (direction === 'upstream') {
    if (ssn.client) {
      ssn.client.emit(str, data);
    }
  } else if (direction === 'downstream') {
    if (ssn.server) {
      ssn.server.emit(str, data);
    }
  }
};

/**
 * Handles the 'middleman' in a 3+-way vagrant session.
 * If a vagrant instance is a 'client' and 'server', it is
 * now considered a 'proxy' and its sole purpose is to proxy
 * information through, upstream or downstream.
 *
 * If vorpal is not a proxy, it resolves a promise for further
 * code that assumes one is now an end user. If it ends up
 * piping the traffic through, it never resolves the promise.
 *
 * @param {String} str
 * @param {String} direction
 * @param {String} data
 * @param {Object} options
 * @api private
 */
vorpal._proxy = function (str, direction, data, options) {
  var self = this;
  return new Promise(function (resolve) {
    var ssn = self.getSessionById(data.sessionId);
    if (ssn && !ssn.isLocal() && ssn.client) {
      self._send(str, direction, data, options);
    } else {
      resolve();
    }
  });
};

/**
 * Returns session by id.
 *
 * @param {Integer} id
 * @return {Session}
 * @api public
 */

vorpal.getSessionById = function (id) {
  if (_.isObject(id)) {
    throw new Error('vorpal.getSessionById: id ' + JSON.stringify(id) + ' should not be an object.');
  }
  var ssn = _.find(this.server.sessions, { id: id });
  ssn = this.session.id === id ? this.session : ssn;
  if (!id) {
    throw new Error('vorpal.getSessionById was called with no ID passed.');
  }
  if (!ssn) {
    var sessions = {
      local: this.session.id,
      server: _.map(this.server.sessions, 'id')
    };
    throw new Error('No session found for id ' + id + ' in vorpal.getSessionById. Sessions: ' + JSON.stringify(sessions));
  }
  return ssn;
};

/**
 * Kills a remote vorpal session. If user
 * is running on a direct terminal, will kill
 * node instance after confirmation.
 *
 * @param {Object} options
 * @param {Function} cb
 * @api private
 */

vorpal.exit = function (options) {
  var ssn = this.getSessionById(options.sessionId);
  if (ssn.isLocal()) {
    process.exit(0);
  } else {
    ssn.server.emit('vantage-close-downstream', { sessionId: ssn.id });
  }
};

Object.defineProperty(vorpal, 'activeCommand', {
  get: function get() {
    var result = this._command ? this._command.commandInstance : undefined;
    return result;
  }
});