const util = require('./util');

class CommandInstance {
  constructor(options = {}) {
    const { command, commandObject, args, commandWrapper, callback, downstream } = options;

    this.args = args;
    this.callback = callback;
    this.command = command;
    this.commandObject = commandObject;
    this.commandWrapper = commandWrapper;
    this.downstream = downstream;
    this.parent = commandWrapper.session.parent;
    this.session = commandWrapper.session;
  }

  /**
   * Cancel running command.
   */
  cancel() {
    this.session.emit('vorpal_command_cancel');
  }

  /**
   * Route stdout either through a piped command, or the session's stdout.
   */
  log(...args) {
    if (!this.downstream) {
      this.session.log(...args);

      return;
    }

    this.session.registerCommand();
    this.downstream.args.stdin = args;

    const onComplete = (error) => {
      if (this.session.isLocal() && error) {
        this.session.log(error.stack || error);
        this.session.parent.emit('client_command_error', {
          command: this.downstream.command,
          error,
        });
      }

      this.session.completeCommand();
    };

    const validate = this.downstream.commandObject._validate;

    if (typeof validate === 'function') {
      try {
        validate.call(this.downstream, this.downstream.args);
      } catch (error) {
        // Log error without piping to downstream on validation error.
        this.session.log(error.toString());
        onComplete();

        return;
      }
    }

    const callback = this.downstream.commandObject._fn;

    if (callback) {
      const response = callback.call(this.downstream, this.downstream.args, onComplete);

      if (response instanceof Promise) {
        response.then(onComplete, onComplete);
      }
    }
  }

  prompt(...args) {
    return this.session.prompt(...args);
  }

  delimiter(...args) {
    return this.session.delimiter(...args);
  }

  help(...args) {
    return this.session.help(...args);
  }

  match(...args) {
    return this.session.match(...args);
  }
}

module.exports = CommandInstance;
