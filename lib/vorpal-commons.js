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

  vorpal
    .command('help [command]')
    .description('Provides help for a given command.')
    .action(function (args, cb) {
      if (args.command) {
        var name = _.findWhere(this.parent.commands, {_name: String(args.command).toLowerCase().trim()});
        if (name && !name._hidden) {
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

  vorpal
    .command('exit')
    .alias('quit')
    .option('-f, --force', 'Forces process kill without confirmation.')
    .description('Exits instance of Vorpal.')
    .action(function (args) {
      args.options = args.options || {};
      args.options.sessionId = this.session.id;
      this.parent.exit(args.options);
    });
};
