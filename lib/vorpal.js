"use strict";

/**
 * Module dependencies.
 */

var _ = require("lodash")
  , EventEmitter = require("events").EventEmitter
  , Command = require("./command")
  , VorpalUtil = require("./util")
  , ui = require("./ui")
  , Session = require("./session")
  , intercept = require("./intercept")
  , commons = require("./vorpal-commons")
  , os = require("os")
  , minimist = require("minimist")
  , chalk = require("chalk")
  ; require("native-promise-only")
  ;

/**
 * Initialize a new `Vorpal` instance.
 *
 * @return {Vorpal}
 * @api public
 */

function Vorpal() {

  if (!(this instanceof Vorpal)) { return new Vorpal(); }

  // Program version
  // Exposed through vorpal.version(str);
  this._version = "";

  // Registered `vorpal.command` commands and
  // their options.
  this.commands = [];

  // Queue of IP requests, executed async, in sync.
  this._queue = [];

  // Current command being executed.
  this._command = void 0;

  // Expose UI.
  this.ui = ui;

  // Exposed through vorpal.delimiter(str).
  this._delimiter = "local@" + String(os.hostname()).split(".")[0] + "~$ ";
  ui.setDelimiter(this._delimiter);

  // Placeholder for vantage server. If vantage
  // is used, this will be over-written.
  this.server = {
    sessions: []
  };

  // Whether all stdout is being hooked through a function.
  this._hooked = false;

  // Expose common utilities, like padding.
  this.util = VorpalUtil;

  this.Session = Session;

  // Active vorpal server session.
  this.session = new this.Session({
    local: true,
    user: "local",
    parent: this,
    delimiter: this._delimiter
  });

  this._init();
  return this;
}

/**
 * Vorpal prototype.
 */

var vorpal = Vorpal.prototype;

/**
 * Extend Vorpal prototype as an event emitter.
 */

Vorpal.prototype.__proto__ = EventEmitter.prototype;

/**
 * Expose `Vorpal`.
 */

exports = module.exports = Vorpal;

/**
 * Extension to `constructor`.
 * @api private
 */

Vorpal.prototype._init = function() {
  var self = this;

  ui.on("vorpal_ui_keypress", function(data){
    self._onKeypress(data.key, data.value);
  });

  self.use(commons);
};

/**
 * Parses `process.argv` and executes
 * a Vorpal command based on it.
 * @api public
 */

Vorpal.prototype.parse = function(argv) {
  var args = argv;
  args.shift();
  args.shift();
  if (args.length > 0) {
    this.exec(args.join(' '));
  }
  return this;
};

/**
 * Sets version of your application's API.
 *
 * @param {String} version
 * @return {Vorpal}
 * @api public
 */

vorpal.version = function(version) {
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

vorpal.delimiter = function(str) {
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

vorpal.use = function(commands, options) {
  if (!commands) { return this; }
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

vorpal.command = function(name, desc, opts) {
  opts = opts || {};
  name = String(name);

  var argsRegExp = /(\[[^\]]*\]|\<[^\>]*\>)/g;
  var args = [];
  var arg;

  while ((arg = argsRegExp.exec(name)) != null) {
    args.push(arg[1]);
  }

  var cmdNameRegExp = /^([^\[\<]*)/;
  var cmdName = cmdNameRegExp.exec(name)[0].trim();

  var cmd = new Command(cmdName, exports);

  if (desc) {
    cmd.description(desc);
    this.executables = true;
  }
  cmd._noHelp = !!opts.noHelp;
  cmd._mode = opts.mode || false;
  cmd._catch = opts.catch || false;
  cmd._parseExpectedArgs(args);
  cmd.parent = this;

  var exists = false;
  for (var i = 0; i < this.commands.length; ++i) {
    exists = (this.commands[i]._name === cmd._name) ? true : exists;
    if (exists) {
      this.commands[i] = cmd;
      break;
    }
  }
  if (!exists) {
    this.commands.push(cmd);
  }

  this.emit("command_registered", { command: cmd, name: name });

  return cmd;
};

/**
 * Registers a new "mode" command in the vorpal API.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command}
 * @api public
 */

vorpal.mode = function(name, desc, opts) {
  return this.command(name, desc, _.extend((opts || {}), { mode: true }));
};

/**
 * Registers a "catch" command in the vorpal API.
 * This is executed when no command matches are found.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command}
 * @api public
 */

vorpal.catch = function(name, desc, opts) {
  return this.command(name, desc, _.extend((opts || {}), { catch: true }));
};

/**
 * Delegates to ui.log.
 *
 * @param {String} log
 * @return {Vorpal}
 * @api public
 */

vorpal.log = function() {
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

vorpal.pipe = function(fn) {
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

vorpal.hook = function(fn) {
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

vorpal._unhook = function() {
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

vorpal._hook = function(fn) {
  if (this._hooked && this._unhook !== undefined) {
    this._unhook();
  }
  this._unhook = intercept(fn);
  this._hooked = true;
  return this;
};

/**
 * Hook the tty prompt to this given instance
 * of vorpal.
 *
 * @return {Vorpal}
 * @api public
 */

vorpal.show = function() {
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

vorpal.hide = function() {
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

vorpal._onKeypress = function(key, value) {
  var self = this;
  if (this.session.isLocal() && !this.session.client) {
    this.session.getKeypressResult(key, value, function(err, result) { 
      if (!err && result !== undefined) {
        if (_.isArray(result)) {
          var formatted = VorpalUtil.prettifyArray(result);
          self.ui.imprint();
          self.session.log(formatted);
        } else {
          self.ui.redraw(result);
        }

        //self.ui.redraw(result);
      }
    });
  } else {
    this._send("vantage-keypress-upstream", "upstream", {
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
 * @param {Function} cb
 * @return {Vorpal}
 * @api public
 */

vorpal.prompt = function(options, cb) {
  var self = this;
  options = options || {};
  var ssn = self.getSessionById(options.sessionId);

  if (!ssn) {
    throw new Error("Vorpal.prompt was called without a passed Session ID.");
  }

  function handler(data) {
    var response = data.value;
    self.removeListener("vantage-prompt-upstream", handler);
    cb(response);
  }

  if (ssn.isLocal()) {
    ui.setDelimiter(options.message || ssn.delimiter);
    ui.prompt(options, function(result) {
      ui.setDelimiter(ssn.delimiter);
      cb(result);
    });
  } else {
    self.on("vantage-prompt-upstream", handler);
    self._send("vantage-prompt-downstream", "downstream", { options: options, value: void 0, sessionId: ssn.id });
  }
  return self;
};

/**
 * Renders the CLI prompt or sends the
 * request to do so downstream.
 *
 * @param {Object} data
 * @return {Vorpal}
 * @api private
 */

vorpal._prompt = function(data) {
  var self = this;
  data = data || {};
  if (!data.sessionId) {
    data.sessionId = self.session.id;
  }
  var ssn = self.getSessionById(data.sessionId);

  // If we somehow got to _prompt and aren't the
  // local client, send the command downstream.
  if (!ssn.isLocal()) {
    this._send("vantage-resume-downstream", "downstream", { sessionId: data.sessionId });
    return self;
  }

  if (ui.midPrompt()) { return self; }

  ui.prompt({
    type: "input",
    name: "command",
    message: ssn.fullDelimiter()
  }, function(result){
    if (self.ui._cancelled === true) { self.ui._cancelled = false; return; }
    var str = String(result.command).trim();
    self.emit("client_prompt_submit", str);
    if (str === "" || str === "undefined") { self._prompt(data); return; }
    self.exec(str, function(){
      self._prompt(data);
    });
  });

  return self;
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

vorpal.exec = function(cmd, args, cb) {
  var self = this
    , ssn = self.session
    ;

  cb = (_.isFunction(args)) ? args : cb;
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
    self._queueHandler.call(self);
    return self;
  } else {
    return new Promise(function(resolve, reject) {
      command.resolve = resolve;
      command.reject = reject;
      self._queue.push(command);
      self._queueHandler.call(self);
    });
  }
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

vorpal._queueHandler = function() {
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

vorpal._execQueueItem = function(cmd) {
  var self = this;
  if (cmd.session.isLocal() && !cmd.session.client) {
    this._exec(cmd);
  } else {
    self._command = cmd;
    self._send("vantage-command-upstream", "upstream", {
      command: cmd.command,
      args: cmd.args,
      completed: false,
      sessionId: cmd.session.id
    });
  }
};

/**
 * Executes a vorpal API command.
 * Warning: Dragons lie beyond this point.
 *
 * @param {String} item
 * @api private
 */

vorpal._exec = function(item) {

  var self = this
    , parts
    , match = false
    , modeCommand
    , args = {}
    ;

  function parseArgsByType(arg, cmdArg) {
    if (arg && cmdArg.variadic === true) {
      args[cmdArg.name] = remainingArgs;
    } else if (arg) {
      args[cmdArg.name] = arg;
      remainingArgs.shift();
    }
  }

  function validateArg(arg, cmdArg) {
    if (arg === undefined && cmdArg.required === true) {
      item.session.log(" ");
      item.session.log("  Missing required argument. Showing Help:");
      item.session.log(match.helpInformation());
      if (!item.callback) {
        if (item.resolve) {
          item.resolve("Missing required argument.");
        }
      } else {
        item.callback();
      }
      return false;
    } else {
      return true;
    }
  }

  item = item || {};

  if (!item.session) {
    throw new Error("Fatal Error: No session was passed into command for execution: " + item);
  }

  if (String(item.command).indexOf("undefine") > -1) {
    console.trace("Undefined ._exec command passed.");
    throw new Error("vorpal._exec was called with an undefined command.");
  }

  item.command = item.command || "";
  modeCommand = item.command;
  item.command = (item.session._mode) ? item.session._mode : item.command;
  parts = item.command.split(" ");

  // History for our "up" and "down" arrows.
  item.session.history((item.session._mode ? modeCommand : item.command));

  // Reverse drill-down the string until you find the
  // first command match.
  for (var i = 0; i < parts.length; ++i) {
    var subcommand = String(parts.slice(0, parts.length - i).join(" ")).trim().toLowerCase();
    match = _.findWhere(this.commands, { _name: subcommand }) || match;
    if (!match) {
      for (var j = 0; j < this.commands.length; ++j) {
        var idx = this.commands[j]._aliases.indexOf(subcommand);
        match = (idx > -1) ? this.commands[j] : match;
      }
    }
    if (match) {
      args = parts.slice(parts.length - i, parts.length).join(" ");
      break;
    }
  }

  // If there's no command match, check if the
  // there's a `catch` command, which catches all
  // missed commands.
  if (!match) {
    match = _.findWhere(this.commands, { _catch: true });
    // If there is one, we still need to make sure we aren't
    // partially matching command groups, such as `do things` when
    // there is a command `do things well`. If we match partially,
    // we still want to show the help menu for that command group.
    if (match) {
      var allCommands = _.pluck(this.commands, "_name");
      var wordMatch = false;
      for (var n = 0; n < allCommands.length; ++n) {
        var parts2 = String(allCommands[n]).split(" ");
        var cmdParts = String(item.command).split(" ");
        var matchAll = true;
        for (var k = 0; k < cmdParts.length; ++k) {
          if (parts2[k] !== cmdParts[k]) {
            matchAll = false;
            break;
          }
        }
        if (matchAll) {
          wordMatch = true;
          break;
        }
      }
      if (wordMatch) {
        match = void 0;
      } else {
        args = item.command;
      }
    }
  }

  // Match means we found a suitable command.
  if (match) {

    var fn = match._fn
      , afterFn = match._after
      , init = match._init || function(arrgs, cb) { cb(); }
      , delimiter = match._delimiter || String(item.command).toLowerCase() + ":"
      , origArgs = match._args
      , origOptions = match.options
      ;

    var parsedBasic = VorpalUtil.parseArgs(args);

    // This basically makes the arguments human readable.
    var parsedArgs = minimist(parsedBasic);

    parsedArgs._ = parsedArgs._ || [];
    args = {};
    args.options = {};

    // Looks for a help arg and throws help if any.
    if (parsedArgs.help || parsedArgs._.indexOf("/?") > -1) {
      item.session.log(match.helpInformation());
      item.callback(); return;
    }

    var remainingArgs = _.clone(parsedArgs._);

    var supportedArgs = 10;
    var valid = true;
    for (var l = 0; l < supportedArgs; ++l) {
      if (origArgs[l]) {
        valid = (!valid) ? false : validateArg(parsedArgs._[l], origArgs[l]);
        if (!valid) { break; }
        parseArgsByType(parsedArgs._[l], origArgs[l]);
      }
    }

    if (!valid) {
      return;
    }

    // Looks for ommitted required options
    // and throws help.
    for (var m = 0; m < origOptions.length; ++m) {
      var o = origOptions[m];
      var short = String(o.short || "").replace(/-/g, "");
      var long = String(o.long || "").replace(/--no-/g, "").replace(/-/g, "");
      var exist = parsedArgs[short] || parsedArgs[long];
      if (exist === true && o.required !== 0) {
        item.session.log(" ");
        item.session.log("  Missing required option. Showing Help:");
        item.session.log(match.helpInformation());
        item.callback("Missing required option.");
        return;
      }
      if (exist !== undefined) {
        args.options[long || short] = exist;
      }
    }

    // If this command throws us into a "mode",
    // prepare for it.
    if (match._mode === true && !item.session._mode) {
      // Assign vorpal to be in a "mode".
      item.session._mode = item.command;
      // Execute the mode's `init` function
      // instead of the `action` function.
      fn = init;
      // Reassign the command history to a
      // cache, replacing it with a blank
      // history for the mode.
      self._histCache = _.clone(self._hist);
      self._histCtrCache = parseFloat(self._histCtr);
      self._hist = [];
      self._histCtr = 0;

      item.session.modeDelimiter(delimiter);

    } else if (item.session._mode) {
      if (String(modeCommand).trim() === "exit") {
        self._exitMode({ sessionId: item.session.id });
        if (item.callback) {
          item.callback.call(self);
        } else if (item.resolve !== undefined) {
          item.resolve();
        }
        return;
      }

      // This executes when actually in a "mode"
      // session. We now pass in the raw text of what
      // is typed into the first param of `action`
      // instead of arguments.
      args = modeCommand;
    }

    // If args were passed into the programmatic
    // `vorpal.exec(cmd, args, callback)`, merge
    // them here.
    if (item.args && _.isObject(item.args)) {
      args = _.extend(args, item.args);
    }

    // Warning: Do not touch unless you have a
    // really good understand of callbacks and
    // Promises (I don't).

    // So what I think I made this do, is call the
    // function declared in the command's .action()
    // method.

    // If calling it seems to return a Promise, we
    // are going to guess they didn't call the
    // callback we passed in.

    // If the 'action' function didn't throw an
    // error, call the `exec`'s callback if it
    // exists, and call it's `resolve` if its a
    // Promise.

    // If the `action` function threw an error,
    // callback with the error or reject the Promise.

    // Call the vorpal API function.
    var res = fn.call(item.session, args, function() {
      self.emit("client_command_executed", { command: item.command });
      var fixedArgs = VorpalUtil.fixArgsForApply(arguments);

      var error = fixedArgs[0];
      var data = fixedArgs[1];
      if (item.callback) {
        item.callback.apply(self, fixedArgs);
        if (afterFn) { afterFn.call(item.session, args); }
      } else {
        if (error !== undefined && item.reject !== undefined) {
          item.reject.call(self, data);
          if (afterFn) { afterFn.call(item.session, args); }
          return;
        } else if (item.resolve !== undefined) {
          item.resolve.call(self, data);
          if (afterFn) { afterFn.call(item.session, args); }
          return;
        }
      }
    });

    // If the Vorpal API function as declared by the user
    // returns a promise, then we do this.
    if (res && _.isFunction(res.then)) {
      res.then(function(data) {
        if (item.session.isLocal()) {
          self.emit("client_command_executed", { command: item.command });
        }
        if (item.callback !== undefined) {
          item.callback(void 0, data); // hmmm changed...
          if (afterFn) { afterFn.call(item.session, args); }
        } else if (item.resolve !== undefined) {
          item.resolve(data);
          if (afterFn) { afterFn.call(item.session, args); }
          return;
        }
      }).catch(function(err) {
        item.session.log(chalk.red("Error: ") + err);
        if (item.session.isLocal()) {
          self.emit("client_command_error", { command: item.command, error: err });
        }
        if (item.callback !== undefined) {
          item.callback(true, err);
          if (afterFn) { afterFn.call(item.session, args); }
        } else if (item.reject !== undefined) {
          item.reject(err);
          if (afterFn) { afterFn.call(item.session, args); }
        }
      });
    }
  } else {
    // If no command match, just return.
    item.session.log(this._commandHelp(item.command));

    if (item.callback) {
      item.callback();
    } else if (item.resolve) {
      item.resolve("Invalid command.");
    }
  }
};

/**
 * Exits out of a give "mode" one is in.
 * Reverts history and delimiter back to
 * regular vorpal usage.
 *
 * @api private
 */

vorpal._exitMode = function(options) {
  var ssn = this.getSessionById(options.sessionId);
  ssn._mode = false;
  this._hist = this._histCache;
  this._histCtr = this._histCtrCache;
  this._histCache = [];
  this._histCtrCache = 0;
  ssn.modeDelimiter(false);
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

vorpal.sigint = function(fn) {
  if (_.isFunction(fn)) {
    ui.sigint(fn);
  } else {
    throw new Error("vorpal.sigint must be passed in a valid function.");
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

vorpal.find = function(name) {
  return _.findWhere(this.commands, { _name: name });
};

/**
 * Returns help string for a given command.
 *
 * @param {String} command
 * @api private
 */

vorpal._commandHelp = function(command) {
  if (!this.commands.length) { return ""; }

  var matches = [];
  var singleMatches = [];

  command = (command) ? String(command).trim().toLowerCase() : void 0;
  for (var i = 0; i < this.commands.length; ++i) {
    var parts = String(this.commands[i]._name).split(" ");
    if (parts.length === 1 && parts[0] === command && !this.commands[i]._hidden && !this.commands[i]._catch) { singleMatches.push(command); }
    var str = "";
    for (var j = 0; j < parts.length; ++j) {
      str = String(str + " " + parts[j]).trim();
      if (str === command && !this.commands[i]._hidden && !this.commands[i]._catch) {
        matches.push(this.commands[i]);
        break;
      }
    }
  }

  var invalidString =
    (command && matches.length === 0 && singleMatches.length === 0)
    ? ["", "  Invalid Command. Showing Help:", ""].join("\n")
    : "";

  var commandMatch = (matches.length > 0) ? true : false;
  var commandMatchLength = (commandMatch) ? String(command).trim().split(" ").length + 1 : 1;
  matches = (matches.length === 0) ? this.commands : matches;

  var commands = matches.filter(function(cmd) {
    return !cmd._noHelp;
  }).filter(function(cmd){
    return !cmd._catch;
  }).filter(function(cmd){
    return !cmd._hidden;
  }).filter(function(cmd){
    return (String(cmd._name).trim().split(" ").length <= commandMatchLength);
  }).map(function(cmd) {
    var args = cmd._args.map(function(arg) {
      return VorpalUtil.humanReadableArgName(arg);
    }).join(" ");

    return [
      cmd._name
        + (cmd._alias
          ? "|" + cmd._alias
          : "")
        + (cmd.options.length
          ? " [options]"
          : "")
        + " " + args
    , cmd.description()
    ];
  });

  var width = commands.reduce(function(max, commandX) {
    return Math.max(max, commandX[0].length);
  }, 0);

  var counts = {};

  var groups = _.uniq(matches.filter(function(cmd) {
    return (String(cmd._name).trim().split(" ").length > commandMatchLength);
  }).map(function(cmd){
    return String(cmd._name).split(" ").slice(0, commandMatchLength).join(" ");
  }).map(function(cmd){
    counts[cmd] = counts[cmd] || 0;
    counts[cmd]++;
    return cmd;
  })).map(function(cmd){
    return "    " + VorpalUtil.pad(cmd + " *", width) + "  " + counts[cmd] + " sub-command" + ((counts[cmd] === 1) ? "" : "s") + ".";
  });

  var commandsString = (commands.length < 1) ? "" : "\n  Commands:" +
    "\n\n" +
    commands
      .map(function(cmd) {
        return VorpalUtil.pad(cmd[0], width) + "  " + cmd[1];
      })
      .join("\n")
      .replace(/^/gm, "    ") + "\n\n";

  var groupsString = (groups.length < 1)
    ? ""
    : "  Command Groups:\n\n" + groups.join("\n") + "\n";

  var results = String(invalidString + commandsString + "\n" + groupsString).replace(/\n\n\n/g, "\n\n");

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

vorpal._send = function(str, direction, data, options) {
  options = options || {};
  data = data || {};
  var ssn = this.getSessionById(data.sessionId);
  if (!ssn) {
    throw new Error("No Sessions logged for ID " + data.sessionId + " in vorpal._send.");
  }
  if (direction === "upstream") {
    if (ssn.client) {
      ssn.client.emit(str, data);
    }
  } else if (direction === "downstream") {
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
vorpal._proxy = function(str, direction, data, options) {
  var self = this;
  return new Promise(function(resolve){
    var ssn = self.getSessionById(data.sessionId);
    if (ssn && (!ssn.isLocal() && ssn.client)) {
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

vorpal.getSessionById = function(id) {
  if (_.isObject(id)) {
    throw new Error("vorpal.getSessionById: id " + JSON.stringify(id) + " should not be an object.");
  }
  var ssn = _.findWhere(this.server.sessions, { id: id });
  ssn = (this.session.id === id) ? this.session : ssn;
  if (!id) {
    throw new Error("vorpal.getSessionById was called with no ID passed.");
  }
  if (!ssn) {
    var sessions = {
      local: this.session.id,
      server: _.pluck(this.server.sessions, "id")
    };
    throw new Error("No session found for id " + id + " in vorpal.getSessionById. Sessions: " + JSON.stringify(sessions));
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

vorpal.exit = function(options) {
  var self = this;
  var ssn = this.getSessionById(options.sessionId);
  if (ssn.isLocal()) {
    if (options.force) {
      process.exit(1);
    } else {
      this.prompt({
        type: "confirm",
        name: "continue",
        default: false,
        message: "This will actually kill this node process. Continue?",
        sessionId: ssn.id
      }, function(result){
        if (result.continue) {
          process.exit(1);
        } else {
          self._prompt({ sessionId: ssn.id });
        }
      });
    }
  } else {
    ssn.server.emit("vantage-close-downstream", { sessionId: ssn.id });
  }
};
