
/**
 * Example of a Vorpal server that uses a "mode"
 * command to create a simple REPL prompt.
 *
 * A "mode" is a special type of command that
 * brings the vorpal prompt into a specific
 * "mode", wherein the prompt changes, and all
 * commands typed fire the `action` function,
 * passing in the typed string as the first
 * argument instead of parsed action parameters.
 */

/**
 * Module dependencies.
 */

var Vorpal = require('./../../');
var _ = require('lodash');

/**
 * Variable declarations.
 */

var banner = 'Welcome to the standalone Vorpal server.';
var port = process.argv[2] || 5000;
var delimiter = String('svr:' + port + '~$').white;
var server;

server = new Vorpal()
  .banner(banner)
  .delimiter(delimiter)
  .listen(port)
  .show();

/**
 * You use `vorpal.mode` the same way you use
 * `vorpal.command`, with the exception of a few
 * more sub-functions.
 *
 * `.delimiter` tags on an additional delimiter
 * to let the user know that you are in the mode.
 * So a prompt saying `nodesvr~$` would now say:
 * `nodesvr~$ repl:`.
 *
 * `.init` is called once, upon entering the mode
 * and take the same arguments as `.action` in a
 * regular `command`.
 *
 * `.action` is repeatedly called each time the
 * user presses [enter] when in a mode. The
 * `command` parameter is the literal string
 * the user typed that time around.
 *
 * Both `init` and `action` require callbacks or
 * promises, or the prompt will not return to the
 * user.
 */

server
  .mode('repl', 'Enters REPL mode.')
  .delimiter('repl:')
  .init(function (args, cb) {
    console.log('Entering REPL Mode. To exit, type \'exit\'.');
    cb();
  })
  .action(function (command, cb) {
    try {
      var res = eval(command);
      var log = (_.isString(res)) ? String(res).white : res;
      console.log(log);
      cb(res);
    } catch (e) {
      console.log(e);
      cb(e);
    }
  });
