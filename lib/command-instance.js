"use strict";

/**
 * Module dependencies.
 */

var util = require('./util');

/**
 * Initialize a new `CommandInstance` instance.
 *
 * @param {String} name
 * @return {CommandInstance}
 * @api public
 */

function CommandInstance(options) {
  var self = this;
  options = options || {};

  this.command = options.command;
  this.args = options.args;
  this.commandWrapper = options.commandWrapper;
  this.callback = options.callback;
  this.downstream = options.downstream;

  this.session = this.commandWrapper.session;
  this.parent = this.session.parent;

  // Route stdout either through a piped
  // command, or the session's stdout.
  this.log = function() {
    var args = util.fixArgsForApply(arguments);
    if (self.downstream) {
      var fn = self.downstream.command._fn || function () {}
      self.session.registerPipedCommand();
      self.downstream.args.stdin = args;
      fn.call(self.downstream, self.downstream.args, function(){

      });
    } else {
      self.session.log.apply(self.session, args);
    }
  };

  return this;
}

module.exports = CommandInstance;