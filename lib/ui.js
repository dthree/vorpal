/* eslint-disable no-console, no-param-reassign */

const { EventEmitter } = require('events');
const chalk = require('chalk');
const inquirer = require('inquirer');
const logUpdate = require('log-update');

const INQUIRER_PROMPTS = ['input', 'checkbox', 'confirm', 'expand', 'list', 'password', 'rawlist'];

class UI extends EventEmitter {
  /**
   * Sets intial variables and registers
   * listeners. This is called once in a
   * process thread regardless of how many
   * instances of Vorpal have been generated.
   */
  constructor() {
    super();

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
        this.parent.emit('vorpal_exit');
        process.exit(0);

        return;
      }

      // If Vorpal isn't shown, just exit.
      if (!this.parent) {
        process.exit(0);

        return;
      }

      const text = this.input();

      // There are commands running if cancelCommands function is available.
      if (this.parent.session.cancelCommands) {
        this.imprint();
        this.submit('');
        this._sigintCalled = false;
        this._sigintCount = 0;
        this.parent.session.emit('vorpal_command_cancel');

      } else if (String(text).trim()) {
        this.imprint();
        this.submit('');
        this._sigintCalled = false;
        this._sigintCount = 0;

      } else {
        this._sigintCalled = false;
        this.delimiter(' ');
        this.submit('');
        this.log('(^C again to quit)');
      }
    };

    const self = this;

    process.stdin.on('keypress', (letter, key = {}) => {
      if (key.ctrl && !key.shift && !key.meta && ['c', 'C'].indexOf(key.name) > -1) {
        this._sigintCount += 1;

        if (this._sigint && !this._sigintCalled) {
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
    INQUIRER_PROMPTS.forEach((promptType) => {
      // Add method to Inquirer to get type of prompt.
      inquirer.prompt.prompts[promptType].prototype.getType = function getType() {
        return promptType;
      };

      // Hook in to steal Inquirer's keypress.
      inquirer.prompt.prompts[promptType].prototype.onKeypress = function onKeypress(e) {
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

      // Add hook to render method
      const baseRender = inquirer.prompt.prompts[promptType].prototype.render;

      inquirer.prompt.prompts[promptType].prototype.render = function render(...args) {
        self._activePrompt = this;

        return baseRender.apply(this, args);
      };
    });

    // Sigint handling - make it more graceful
    const onSigInt = () => {
      if (typeof this._sigint === 'function' && !this._sigintCalled) {
        this._sigintCalled = true;
        this._sigint.call(this.parent);
      }
    };

    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigInt);
  }

  /**
   * Hook for sigint event.
   */
  sigint(fn) {
    if (typeof fn === 'function') {
      this._sigint = fn;
    } else {
      throw new Error('UI#sigint must be passed a valid function.');
    }

    return this;
  }

  /**
   * Creates an inquirer prompt on the TTY.
   */
  prompt(options = {}, cb = null) {
    let prompt;

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
      throw new Error('UI prompt called when already in a prompt.');
    }

    this._midPrompt = true;

    try {
      prompt = inquirer.prompt(options).then((result) => {
        this.inquirerStdout = [];
        this._midPrompt = false;

        if (this._cancel) {
          this._cancel = false;
        } else {
          cb(result);
        }
      });
    } catch (e) {
      console.log('Vorpal prompt error:', e);
    }

    return prompt;
  }

  /**
   * Returns a boolean as to whether user
   * is mid another prompt.
   */
  midPrompt() {
    return (this._midPrompt && this.parent);
  }

  setDelimiter(value) {
    if (!this.parent) {
      return;
    }

    const self = this;

    this._lastDelimiter = `${String(value).trim()} `;

    inquirer.prompt.prompts.password.prototype.getQuestion = function getPasswordQuestion() {
      self._activePrompt = this;

      return this.opt.message;
    };

    inquirer.prompt.prompts.input.prototype.getQuestion = function getInputQuestion() {
      self._activePrompt = this;

      let { message } = this.opt;

      if ((this.opt.default || this.opt.default === false) && this.status !== 'answered') {
        message += chalk.dim(` (${this.opt.default}) `);
      }

      self.inquirerStdout.push(message);

      return message;
    };
  }

  /**
   * Event handler for keypresses - deals with command history
   * and tabbed auto-completion.
   */
  _keypressHandler(e, prompt) {
    // Remove tab characters from user input
    prompt.rl.line = prompt.rl.line.replace(/\t+/, '');

    // Mask passwords
    const line = (prompt.getType() === 'password')
      ? '*'.repeat(prompt.rl.line.length)
      : prompt.rl.line;

    // Re-write render function
    const width = prompt.rl.line.length;
    const newWidth = prompt.rl.line.length;
    const diff = newWidth - width;

    prompt.rl.cursor += diff;

    const message = prompt.getQuestion() + (prompt.status === 'answered') ?
      chalk.cyan(prompt.answer) :
      line;

    prompt.screen.render(message);

    const key = (e.key || {}).name;
    const value = prompt ? String(line) : undefined;

    this.emit('vorpal_ui_keypress', { key, value, e });
  }

  /**
   * Pauses active prompt, returning
   * the value of what had been typed so far.
   */
  pause() {
    if (!this.parent || !this._activePrompt || !this._midPrompt) {
      return false;
    }

    const value = this._lastDelimiter + this._activePrompt.rl.line;

    this._midPrompt = false;

    const { screen } = this._activePrompt;

    screen.rl.output.unmute();
    screen.clean();
    screen.rl.output.write('');

    return value;
  }

  /**
   * Resumes active prompt, accepting
   * a string, which will fill the prompt
   * with that text and put the cursor at
   * the end.
   */
  resume(value) {
    if (!this.parent || !this._activePrompt || this._midPrompt) {
      return this;
    }

    this._activePrompt.screen.rl.output.write(value || '');
    this._midPrompt = true;

    return this;
  }

  /**
   * Cancels the active prompt, essentially
   * but cutting out of the inquirer loop.
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
   */
  attach(vorpal) {
    this.parent = vorpal;
    this.refresh();
    this.parent._prompt();

    return this;
  }

  /**
   * Detaches UI from a given Vorpal instance.
   */

  detach(vorpal) {
    if (vorpal === this.parent) {
      this.parent = null;
    }

    return this;
  }

  /**
   * Receives and runs logging through
   * a piped function is one is provided
   * through ui.pipe(). Pauses any active
   * prompts, logs the data and then if
   * paused, resumes the prompt.
   */
  log(...params) {
    const args = (typeof this._pipeFn === 'function')
      ? this._pipeFn(params)
      : params;

    if (!args || args === '') {
      return this;
    }

    if (this.midPrompt()) {
      const data = this.pause();

      if (data) {
        this.resume(data);
      } else {
        console.log('Log got back \'false\' as data. This shouldn\'t happen.', data);
      }
    }

    return this;
  }

  /**
   * Submits a given prompt.
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
   */
  delimiter(delimiter) {
    if (!this._activePrompt) {
      return this;
    }

    const prompt = this._activePrompt;

    if (!delimiter) {
      return prompt.opt.message;
    }

    prompt.opt.message = delimiter;
    this.refresh();

    return this;
  }

  /**
   * Re-writes the input of an Inquirer prompt.
   * If no string is passed, it gets the current
   * input.
   */
  input(input) {
    if (!this._activePrompt) {
      return undefined; // TODO
    }

    const prompt = this._activePrompt;

    if (!input) {
      return prompt.rl.line;
    }

    const width = prompt.rl.line.length;

    prompt.rl.line = input;

    const newWidth = prompt.rl.line.length;
    const diff = newWidth - width;

    prompt.rl.cursor += diff;

    const message = prompt.getQuestion() + (prompt.status === 'answered')
      ? chalk.cyan(prompt.answer)
      : prompt.rl.line;

    prompt.screen.render(message);

    return this;
  }

  /**
   * Logs the current delimiter and typed data.
   */
  imprint() {
    if (!this.parent) {
      return this;
    }

    const { line } = this._activePrompt.rl;
    const delimiter = this._lastDelimiter || this.delimiter() || '';

    this.log(delimiter + line);

    return this;
  }

  /**
   * Redraws the inquirer prompt with a new string.
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
   */
  redraw(output) {
    logUpdate(output);

    return this;
  }
}

/**
 * Initialize singleton.
 */
const ui = new UI();

/**
 * Clears logging from `ui.redraw` permanently.
 */
ui.redraw.clear = function clear() {
  logUpdate.clear();

  return ui;
};

/**
 * Prints logging from `ui.redraw` permanently.
 */
ui.redraw.done = function done() {
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

// TODO investigate
global.__vorpal = global.__vorpal || {};
global.__vorpal.ui = global.__vorpal.ui || {
  exists: false,
  exports: undefined,
};

if (global.__vorpal.ui.exists) {
  module.exports = global.__vorpal.ui.exports;
} else {
  global.__vorpal.ui.exists = true;
  global.__vorpal.ui.exports = ui;
  exports = ui;
  module.exports = ui;
}
