'use strict';

/**
 * Module dependencies.
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var util = require('./util');
var _ = require('lodash');

var CommandInstance = function () {

  /**
   * Initialize a new `CommandInstance` instance.
   *
   * @param {Object} params
   * @return {CommandInstance}
   * @api public
   */

  function CommandInstance() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var command = _ref.command;
    var commandObject = _ref.commandObject;
    var args = _ref.args;
    var commandWrapper = _ref.commandWrapper;
    var callback = _ref.callback;
    var downstream = _ref.downstream;

    _classCallCheck(this, CommandInstance);

    this.command = command;
    this.commandObject = commandObject;
    this.args = args;
    this.commandWrapper = commandWrapper;
    this.session = commandWrapper.session;
    this.parent = this.session.parent;
    this.callback = callback;
    this.downstream = downstream;
  }

  /**
   * Cancel running command.
   */

  _createClass(CommandInstance, [{
    key: 'cancel',
    value: function cancel() {
      this.session.emit('vorpal_command_cancel');
    }

    /**
     * Route stdout either through a piped command, or the session's stdout.
     */

  }, {
    key: 'log',
    value: function log() {
      var _this = this;

      var args = util.fixArgsForApply(arguments);
      if (this.downstream) {
        var fn = this.downstream.commandObject._fn || function () {};
        this.session.registerCommand();
        this.downstream.args.stdin = args;
        var onComplete = function onComplete(err) {
          if (_this.session.isLocal() && err) {
            _this.session.log(err.stack || err);
            _this.session.parent.emit('client_command_error', { command: _this.downstream.command, error: err });
          }
          _this.session.completeCommand();
        };

        var validate = this.downstream.commandObject._validate;
        if (_.isFunction(validate)) {
          try {
            validate.call(this.downstream, this.downstream.args);
          } catch (e) {
            // Log error without piping to downstream on validation error.
            this.session.log(e.toString());
            onComplete();
            return;
          }
        }

        var res = fn.call(this.downstream, this.downstream.args, onComplete);
        if (res && _.isFunction(res.then)) {
          res.then(onComplete, onComplete);
        }
      } else {
        this.session.log.apply(this.session, args);
      }
    }
  }, {
    key: 'prompt',
    value: function prompt(a, b, c) {
      return this.session.prompt(a, b, c);
    }
  }, {
    key: 'delimiter',
    value: function delimiter(a, b, c) {
      return this.session.delimiter(a, b, c);
    }
  }, {
    key: 'help',
    value: function help(a, b, c) {
      return this.session.help(a, b, c);
    }
  }, {
    key: 'match',
    value: function match(a, b, c) {
      return this.session.match(a, b, c);
    }
  }]);

  return CommandInstance;
}();

module.exports = CommandInstance;