'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const inquirer = require('inquirer');
const EventEmitter = require('events').EventEmitter;
const chalk = require('chalk');
const util = require('./util');
const logUpdate = require('log-update');

class UI extends EventEmitter {

  /**
   * Sets intial variables and registers
   * listeners. This is called once in a
   * process thread regardless of how many
   * instances of Vorpal have been generated.
   *
   * @api private
   */

  constructor() {
    super();
    const self = this;

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

    // prompt history from inquirer
    this.inquirerStdout = [];

    // Whether a prompt is currently in cancel mode.
    this._cancelled = false;

    // Middleware for piping stdout through.
    this._pipeFn = undefined;

    // Custom function on sigint event.
    this._sigintCalled = false;
    this._sigintCount = 0;
    this._sigint = () => {
      if (this._sigintCount > 1) {
        process.exit(0);
      } else {
        const text = this.input();
        if (!this.parent) {
          // If Vorpal isn't shown, just exit.
          process.exit(0);
        } else if (this.parent.session.cancelCommands) {
          // There are commands running if
          // cancelCommands function is available.
          this.submit('');
          this._sigintCalled = false;
          this._sigintCount = 0;
          this.parent.session.emit('vorpal_command_cancel');
        } else if (String(text).trim() !== '') {
          this.submit('');
          this._sigintCalled = false;
          this._sigintCount = 0;
        } else {
          this._sigintCalled = false;
          this.delimiter(' ');
          this.submit('');
          this.log('(^C again to quit)');
        }
      }
    };

    process.stdin.on('keypress', (letter, key) => {
      key = key || {};
      if (key.ctrl === true && key.shift === false && key.meta === false && ['c', 'C'].indexOf(key.name) > -1) {
        this._sigintCount++;
        if (this._sigint !== undefined && !this._sigintCalled) {
          this._sigintCalled = true;
          this._sigint.call(self.parent);
          this._sigintCalled = false;
        }
      } else {
        this._sigintCalled = false;
        this._sigintCount = 0;
      }
    });

    // Extend the render function to steal the active prompt object,
    // as inquirer doesn't expose it and we need it.
    const prompts = ['input', 'checkbox', 'confirm', 'expand', 'list', 'password', 'rawlist'];

    for (const key in prompts) {
      const promptType = prompts[key];

      // Add method to Inquirer to get type of prompt.
      inquirer.prompt.prompts[promptType].prototype.getType = function () {
        return promptType;
      };

      // Hook in to steal Inquirer's keypress.
      inquirer.prompt.prompts[promptType].prototype.onKeypress = function (e) {
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

      // Add hook to render method.
      const render = inquirer.prompt.prompts[promptType].prototype.render;
      inquirer.prompt.prompts[promptType].prototype.render = function () {
        self._activePrompt = this;
        return render.call(this);
      };
    }

    // Sigint handling - make it more graceful.
    const onSigInt = () => {
      if (_.isFunction(this._sigint) && !this._sigintCalled) {
        this._sigintCalled = true;
        this._sigint.call(this.parent);
      }
    };
    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigInt);
  }

  /**
   * Hook for sigint event.
   *
   * @param {Object} options
   * @param {Function} cb
   * @api public
   */

  sigint(fn) {
    if (_.isFunction(fn)) {
      this._sigint = fn;
    } else {
      throw new Error('vorpal.ui.sigint must be passed in a valid function.');
    }
    return this;
  }

  /**
   * Creates an inquirer prompt on the TTY.
   *
   * @param {Object} options
   * @param {Function} cb
   * @api public
   */

  prompt(options, cb) {
    let prompt;
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
    if (this._midPrompt) {
      console.log('Prompt called when mid prompt...');
      throw new Error('UI Prompt called when already mid prompt.');
    }
    this._midPrompt = true;
    try {
      prompt = inquirer.prompt(options, (result) => {
        this.inquirerStdout = [];
        this._midPrompt = false;
        if (this._cancel === true) {
          this._cancel = false;
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
      setTimeout(() => {
        // this._activePrompt = prompt._activePrompt;
      }, 100);
    } catch (e) {
      console.log('Vorpal Prompt error:', e);
    }
    return prompt;
  }

  /**
   * Returns a boolean as to whether user
   * is mid another pr ompt.
   *
   * @return {Boolean}
   * @api public
   */

  midPrompt() {
    const mid = (this._midPrompt === true && this.parent !== undefined);
    return mid;
  }

  setDelimiter(str) {
    const self = this;
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
      let message = this.opt.message;
      if ((this.opt.default || this.opt.default === false)
        && this.status !== 'answered') {
        message += chalk.dim('(' + this.opt.default + ') ');
      }
      self.inquirerStdout.push(message);
      return message;
    };
  }

  /**
   * Event handler for keypresses - deals with command history
   * and tabbed auto-completion.
   *
   * @param {Event} e
   * @param {Prompt} prompt
   * @api private
   */

  _keypressHandler(e, prompt) {
    // Remove tab characters from user input.
    prompt.rl.line = prompt.rl.line.replace(/\t+/, '');

    // Mask passwords.
    const line = prompt.getType() !== 'password' ?
      prompt.rl.line :
      '*'.repeat(prompt.rl.line.length);

    // Re-write render function.
    const width = prompt.rl.line.length;
    const newWidth = prompt.rl.line.length;
    const diff = newWidth - width;
    prompt.rl.cursor += diff;
    const cursor = 0;
    let message = prompt.getQuestion();
    const addition = (prompt.status === 'answered') ?
      chalk.cyan(prompt.answer) :
      line;
    message += addition;
    prompt.screen.render(message, {cursor: cursor});

    const key = (e.key || {}).name;
    const value = (prompt) ? String(line) : undefined;
    this.emit('vorpal_ui_keypress', {key: key, value: value, e: e});
  }

  /**
   * Pauses active prompt, returning
   * the value of what had been typed so far.
   *
   * @return {String} val
   * @api public
   */

  pause() {
    if (!this.parent) {
      return false;
    }
    if (!this._activePrompt) {
      return false;
    }
    if (!this._midPrompt) {
      return false;
    }
    const val = this._lastDelimiter + this._activePrompt.rl.line;
    this._midPrompt = false;
    const rl = this._activePrompt.screen.rl;
    const screen = this._activePrompt.screen;
    rl.output.unmute();
    screen.clean();
    rl.output.write('');
    return val;
  }

  /**
   * Resumes active prompt, accepting
   * a string, which will fill the prompt
   * with that text and put the cursor at
   * the end.
   *
   * @param {String} val
   * @api public
   */

  resume(val) {
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
    const rl = this._activePrompt.screen.rl;
    rl.output.write(val);
    this._midPrompt = true;
    return this;
  }

  /**
   * Cancels the active prompt, essentially
   * but cutting out of the inquirer loop.
   *
   * @api public
   */

  cancel() {
    if (this.midPrompt()) {
      this._cancel = true;
      this.submit('');
      this._midPrompt = false;
    }
    return this;
  }

  /**
   * Attaches TTY prompt to a given Vorpal instance.
   *
   * @param {Vorpal} vorpal
   * @return {UI}
   * @api public
   */

  attach(vorpal) {
    this.parent = vorpal;
    this.refresh();
    this.parent._prompt();
    return this;
  }

  /**
   * Detaches UI from a given Vorpal instance.
   *
   * @param {Vorpal} vorpal
   * @return {UI}
   * @api public
   */

  detach(vorpal) {
    if (vorpal === this.parent) {
      this.parent = undefined;
    }
    return this;
  }

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

  log() {
    let args = util.fixArgsForApply(arguments);
    args = (_.isFunction(this._pipeFn)) ?
      this._pipeFn(args) :
      args;
    if (args === '') {
      return this;
    }
    args = util.fixArgsForApply(args);
    if (this.midPrompt()) {
      const data = this.pause();
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
  }

  /**
   * Submits a given prompt.
   *
   * @param {String} value
   * @return {UI}
   * @api public
   */

  submit() {
    if (this._activePrompt) {
      // this._activePrompt.screen.onClose();
      this._activePrompt.rl.emit('line');
      // this._activePrompt.onEnd({isValid: true, value: value});
      // to do - I don't know a good way to do this.
    }
    return this;
  }

  /**
   * Does a literal, one-time write to the
   * *current* prompt delimiter.
   *
   * @param {String} str
   * @return {UI}
   * @api public
   */

  delimiter(str) {
    if (!this._activePrompt) {
      return this;
    }
    const prompt = this._activePrompt;
    if (str === undefined) {
      return prompt.opt.message;
    }
    prompt.opt.message = str;
    this.refresh();
    return this;
  }

  /**
   * Re-writes the input of an Inquirer prompt.
   * If no string is passed, it gets the current
   * input.
   *
   * @param {String} str
   * @return {String}
   * @api public
   */

  input(str) {
    if (!this._activePrompt) {
      return undefined;
    }
    const prompt = this._activePrompt;
    if (str === undefined) {
      return prompt.rl.line;
    }
    const width = prompt.rl.line.length;
    prompt.rl.line = str;
    const newWidth = prompt.rl.line.length;
    const diff = newWidth - width;
    prompt.rl.cursor += diff;
    const cursor = 0;
    let message = prompt.getQuestion();
    const addition = (prompt.status === 'answered') ?
      chalk.cyan(prompt.answer) :
      prompt.rl.line;
    message += addition;
    prompt.screen.render(message, {cursor: cursor});
    return this;
  }

  /**
   * Redraws the inquirer prompt with a new string.
   *
   * @param {String} str
   * @return {UI}
   * @api private
   */

  refresh() {
    if (!this.parent || !this._activePrompt) {
      return this;
    }
    this._activePrompt.screen.clean();
    this._activePrompt.render();
    this._activePrompt.rl.output.write(this._activePrompt.rl.line);
    return this;
  }

  /**
   * Writes over existing logging.
   *
   * @param {String} str
   * @return {UI}
   * @api public
   */

  redraw(str) {
    logUpdate(str);
    return this;
  }

}

/**
 * Initialize singleton.
 */

const ui = new UI();

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
  module.exports = exports = global.__vorpal.ui.exports;
} else {
  module.exports = global.__vorpal.ui.exports;
}
