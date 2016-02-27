'use strict';

/**
 * Function library for Vorpal's out-of-the-box
 * API commands. Imported into a Vorpal server
 * through vorpal.use(module).
 */

/**
 * Module dependencies.
 */

var _ = require('lodash');

module.exports = function (vorpal) {
  /**
   * Help for a particular command.
   */

  vorpal.command('help [command...]').description('Provides help for a given command.').action(function (args, cb) {
    var self = this;
    if (args.command) {
      args.command = args.command.join(' ');
      var name = _.find(this.parent.commands, { _name: String(args.command).toLowerCase().trim() });
      if (name && !name._hidden) {
        if (_.isFunction(name._help)) {
          name._help(args.command, function (str) {
            self.log(str);
            cb();
          });
          return;
        }
        this.log(name.helpInformation());
      } else {
        this.log(this.parent._commandHelp(args.command));
      }
    } else {
      this.log(this.parent._commandHelp(args.command));
    }
    cb();
  });

  /**
   * Exits Vorpal.
   */

  vorpal.command('exit').alias('quit').description('Exits application.').action(function (args) {
    args.options = args.options || {};
    args.options.sessionId = this.session.id;
    this.parent.exit(args.options);
  });
};