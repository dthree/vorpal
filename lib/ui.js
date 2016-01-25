'use strict';

/**
 * Module dependencies.
 */

var _ = require('lodash');
var inquirer = require('inquirer');
var EventEmitter = require('events').EventEmitter;
var chalk = require('chalk');
var util = require('./util');
var logUpdate = require('log-update');

var ui = {

  /**
   * Sets intial variables and registers
   * listeners. This is called once in a
   * process thread regardless of how many
   * instances of Vorpal have been generated.
   *
   * @api private
   */

  _init: function () {
    var self = this;

    // Attached vorpal instance. The UI can
    // only attach to one instance of Vorpal
    // at a time, and directs all events to that
    // instance.
    this.parent = undefined;

    // Hook to reference active inquirer prompt.
    this._activePrompt = undefined;

    // Fail-safe to ensure there is no double
    // prompt in odd situations.
    this._midPrompt = false;

    // Handle for inquirer's prompt.
    this.inquirer = inquirer;

    // Whether a prompt is currently in cancel mode.
    this._cancelled = false;

    // Middleware for piping stdout through.
    this._pipeFn = undefined;

    // Custom function on sigint event.
    this._sigintCalled = false;
    this._sigintCount = 0;
    this._sigint = function () {
      if (self._sigintCount > 1) {
        process.exit(2);
      } else {
        var text = self.input();
        if (!self.parent) {
          // If Vorpal isn't shown, just exit.
          process.exit(2);
        } else if (self.parent.session.cancelCommands) {
          // There are commands running if
          // cancelCommands function is available.
          self.imprint();
          self.submit('');
          self._sigintCalled = false;
          self._sigintCount = 0;
          self.parent.session.emit('vorpal_command_cancel');
        } else if (String(text).trim() !== '') {
          self.imprint();
          self.submit('');
          self._sigintCalled = false;
          self._sigintCount = 0;
        } else {
          self._sigintCalled = false;
          self.delimiter(' ');
          self.submit('');
          self.log('(^C again to quit)');
        }
      }
    };

    process.stdin.on('keypress', function (letter, key) {
      key = key || {};
      if (key.ctrl === true && key.shift === false && key.meta === false && ['c', 'C'].indexOf(key.name) > -1) {
        self._sigintCount++;
        if (self._sigint !== undefined && !self._sigintCalled) {
          self._sigintCalled = true;
          self._sigint.call(self.parent);
        }
      } else {
        self._sigintCalled = false;
        self._sigintCount = 0;
      }
    });

    // Extend the render function to steal the active prompt object,
    // as inquirer doesn't expose it and we need it.
    var prompts = ['input', 'checkbox', 'confirm', 'expand', 'list', 'password', 'rawlist'];
    for (var i = 0; i < prompts.length; ++i) {
      // Hook in to steal inquirer's keypress.
      inquirer.prompt.prompts[prompts[i]].prototype.onKeypress = function (e) {
        // Inquirer seems to have a bug with release v0.10.1
        // (not 0.10.0 though) that triggers keypresses for
        // the previous prompt in addition to the current one.
        // So if the prompt is answered, shut it up.
        if (this.status && this.status === 'answered') {
          return;
        }
        self._activePrompt = this;
        self.parent.emit('client_keypress', e);
        self._keypressHandler(e, this);
      };

      (function (render) {
        inquirer.prompt.prompts[prompts[i]].prototype.render = function () {
          self._activePrompt = this;
          return render.call(this);
        };
      })(inquirer.prompt.prompts[prompts[i]].prototype.render);
    }

    // Sigint handling - make it more graceful.
    process.on('SIGINT', function () {
      if (_.isFunction(self._sigint) && !self._sigintCalled) {
        self._sigintCalled = true;
        self._sigint.call(self.parent);
      }
    });

    process.on('SIGTERM', function () {
      if (_.isFunction(self._sigint) && !self._sigintCalled) {
        self._sigintCalled = true;
        self._sigint.call(self.parent);
      }
    });
  },

  /**
   * Hook for sigint event.
   *
   * @param {Object} options
   * @param {Function} cb
   * @api public
   */

  sigint: function (fn) {
    if (_.isFunction(fn)) {
      this._sigint = fn;
    } else {
      throw new Error('vorpal.ui.sigint must be passed in a valid function.');
    }
    return this;
  },

  /**
   * Creates an inquirer prompt on the TTY.
   *
   * @param {Object} options
   * @param {Function} cb
   * @api public
   */

  prompt: function (options, cb) {
    var self = this;
    var prompt;
    options = options || {};
    if (!this.parent) {
      return prompt;
    }
    if (options.delimiter) {
      this.setDelimiter(options.delimiter);
    }
    if (options.message) {
      this.setDelimiter(options.message);
    }
    if (self._midPrompt) {
      console.log('Prompt called when mid prompt...');
      throw new Error('UI Prompt called when already mid prompt.');
    }
    self._midPrompt = true;
    try {
      prompt = inquirer.prompt(options, function (result) {
        self._midPrompt = false;
        if (self._cancel === true) {
          self._cancel = false;
        } else {
          cb(result);
        }
      });

      // Temporary hack. We need to pull the active
      // prompt from inquirer as soon as possible,
      // however we can't just assign it sync, as
      // the prompt isn't ready yet.
      // I am trying to get inquirer extended to
      // fire an event instead.
      setTimeout(function () {
        // self._activePrompt = prompt._activePrompt;
      }, 100);
    } catch (e) {
      console.log('Vorpal Prompt error:', e);
    }
    return prompt;
  },

  /**
   * Returns a boolean as to whether user
   * is mid another pr ompt.
   *
   * @return {Boolean}
   * @api public
   */

  midPrompt: function () {
    var mid = (this._midPrompt === true && this.parent !== undefined);
    return mid;
  },

  setDelimiter: function (str) {
    var self = this;
    if (!this.parent) {
      return;
    }
    str = String(str).trim() + ' ';
    this._lastDelimiter = str;
    inquirer.prompt.prompts.password.prototype.getQuestion = function () {
      self._activePrompt = this;
      return this.opt.message;
    };
    inquirer.prompt.prompts.input.prototype.getQuestion = function () {
      self._activePrompt = this;
      return this.opt.message;
    };
  },

  /**
   * Event handler for keypresses - deals with command history
   * and tabbed auto-completion.
   *
   * @param {Event} e
   * @param {Prompt} prompt
   * @api private
   */

  _keypressHandler: function (e, prompt) {
    // Re-write render function.
    var width = prompt.rl.line.length;
    prompt.rl.line = prompt.rl.line.replace(/\t+/, '');
    var newWidth = prompt.rl.line.length;
    var diff = newWidth - width;
    prompt.rl.cursor += diff;
    var cursor = 0;
    var message = prompt.getQuestion();
    var addition = (prompt.status === 'answered') ?
      chalk.cyan(prompt.answer) :
      prompt.rl.line;
    message += addition;
    prompt.screen.render(message, {cursor: cursor});

    var key = (e.key || {}).name;
    var value = (prompt) ? String(prompt.rl.line) : undefined;
    this.emit('vorpal_ui_keypress', {key: key, value: value, e: e});
  },

  /**
   * Pauses active prompt, returning
   * the value of what had been typed so far.
   *
   * @return {String} val
   * @api public
   */

  pause: function () {
    if (!this.parent) {
      return false;
    }
    if (!this._activePrompt) {
      return false;
    }
    if (!this._midPrompt) {
      return false;
    }
    var val = this._lastDelimiter + this._activePrompt.rl.line;
    this._midPrompt = false;
    var rl = this._activePrompt.screen.rl;
    var screen = this._activePrompt.screen;
    rl.output.unmute();
    screen.clean();
    rl.output.write('');
    return val;
  },

  /**
   * Resumes active prompt, accepting
   * a string, which will fill the prompt
   * with that text and put the cursor at
   * the end.
   *
   * @param {String} val
   * @api public
   */

  resume: function (val) {
    if (!this.parent) {
      return this;
    }
    val = val || '';
    if (!this._activePrompt) {
      return this;
    }
    if (this._midPrompt) {
      return this;
    }
    var rl = this._activePrompt.screen.rl;
    rl.output.write(val);
    this._midPrompt = true;
    return this;
  },

  /**
   * Cancels the active prompt, essentially
   * but cutting out of the inquirer loop.
   *
   * @api public
   */

  cancel: function () {
    if (this.midPrompt()) {
      this._cancel = true;
      this.submit('');
      this._midPrompt = false;
    }
    return this;
  },

  /**
   * Attaches TTY prompt to a given Vorpal instance.
   *
   * @param {Vorpal} vorpal
   * @return {UI}
   * @api public
   */

  attach: function (vorpal) {
    this.parent = vorpal;
    this.refresh();
    this.parent._prompt();
    return this;
  },

  /**
   * Detaches UI from a given Vorpal instance.
   *
   * @param {Vorpal} vorpal
   * @return {UI}
   * @api public
   */

  detach: function (vorpal) {
    if (vorpal === this.parent) {
      this.parent = undefined;
    }
    return this;
  },

  /**
   * Receives and runs logging through
   * a piped function is one is provided
   * through ui.pipe(). Pauses any active
   * prompts, logs the data and then if
   * paused, resumes the prompt.
   *
   * @return {UI}
   * @api public
   */

  log: function () {
    var args = util.fixArgsForApply(arguments);
    args = (_.isFunction(this._pipeFn)) ?
      this._pipeFn(args) :
      args;
    if (args === '') {
      return this;
    }
    args = util.fixArgsForApply(args);
    if (this.midPrompt()) {
      var data = this.pause();
      console.log.apply(console.log, args);
      if (typeof data !== 'undefined' && data !== false) {
        this.resume(data);
      } else {
        console.log('Log got back \'false\' as data. This shouldn\'t happen.', data);
      }
    } else {
      console.log.apply(console.log, args);
    }
    return this;
  },

  /**
   * Submits a given prompt.
   *
   * @param {String} value
   * @return {UI}
   * @api public
   */

  submit: function () {
    if (this._activePrompt) {
      // this._activePrompt.screen.onClose();
      this._activePrompt.rl.emit('line');
      // this._activePrompt.onEnd({isValid: true, value: value});
      // to do - I don't know a good way to do this.
    }
    return this;
  },

  /**
   * Does a literal, one-time write to the
   * *current* prompt delimiter.
   *
   * @param {String} str
   * @return {UI}
   * @api public
   */

  delimiter: function (str) {
    if (!this._activePrompt) {
      return this;
    }
    var prompt = this._activePrompt;
    if (str === undefined) {
      return prompt.opt.message;
    }
    prompt.opt.message = str;
    this.refresh();
    return this;
  },

  /**
   * Re-writes the input of an Inquirer prompt.
   * If no string is passed, it gets the current
   * input.
   *
   * @param {String} str
   * @return {String}
   * @api public
   */

  input: function (str) {
    if (!this._activePrompt) {
      return undefined;
    }
    var prompt = this._activePrompt;
    if (str === undefined) {
      return prompt.rl.line;
    }
    var width = prompt.rl.line.length;
    prompt.rl.line = str;
    var newWidth = prompt.rl.line.length;
    var diff = newWidth - width;
    prompt.rl.cursor += diff;
    var cursor = 0;
    var message = prompt.getQuestion();
    var addition = (prompt.status === 'answered') ?
      chalk.cyan(prompt.answer) :
      prompt.rl.line;
    message += addition;
    prompt.screen.render(message, {cursor: cursor});
    return this;
  },

  /**
   * Logs the current delimiter and typed data.
   *
   * @return {UI}
   * @api public
   */

  imprint: function () {
    if (!this.parent) {
      return this;
    }
    var val = this._activePrompt.rl.line;
    var delimiter = this._lastDelimiter || this.delimiter() || '';
    this.log(delimiter + val);
    return this;
  },

  /**
   * Redraws the inquirer prompt with a new string.
   *
   * @param {String} str
   * @return {UI}
   * @api private
   */

  refresh: function () {
    if (!this.parent || !this._activePrompt) {
      return this;
    }
    this._activePrompt.screen.clean();
    this._activePrompt.render();
    this._activePrompt.rl.output.write(this._activePrompt.rl.line);
    return this;
  },

  /**
   * Writes over existing logging.
   *
   * @param {String} str
   * @return {UI}
   * @api public
   */

  redraw: function (str) {
    logUpdate(str);
    return this;
  }

};

/**
 * Clears logging from `ui.redraw`
 * permanently.
 *
 * @return {UI}
 * @api public
 */

ui.redraw.clear = function () {
  logUpdate.clear();
  return ui;
};

/**
 * Prints logging from `ui.redraw`
 * permanently.
 *
 * @return {UI}
 * @api public
 */

ui.redraw.done = function () {
  logUpdate.done();
  ui.refresh();
  return ui;
};

/**
 * Make UI an EventEmitter.
 */

_.assign(ui, EventEmitter.prototype);

/**
 * Expose `ui`.
 *
 * Modifying global? WTF?!? Yes. It is evil.
 * However node.js prompts are also quite
 * evil in a way. Nothing prevents dual prompts
 * between applications in the same terminal,
 * and inquirer doesn't catch or deal with this, so
 * if you want to start two independent instances of
 * vorpal, you need to know that prompt listeners
 * have already been initiated, and that you can
 * only attach the tty to one vorpal instance
 * at a time.
 * When you fire inqurier twice, you get a double-prompt,
 * where every keypress fires twice and it's just a
 * total mess. So forgive me.
 */

global.__vorpal = global.__vorpal || {};
global.__vorpal.ui = global.__vorpal.ui || {
  exists: false,
  exports: undefined
};

if (!global.__vorpal.ui.exists) {
  global.__vorpal.ui.exists = true;
  global.__vorpal.ui.exports = ui;
  module.exports = exports = ui;
  ui._init();
} else {
  module.exports = global.__vorpal.ui.exports;
}
