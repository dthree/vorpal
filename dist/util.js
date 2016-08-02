'use strict';

/**
 * Module dependencies.
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _ = require('lodash');
var minimist = require('minimist');
var strip = require('strip-ansi');

var util = {
  /**
   * Parses command arguments from multiple
   * sources.
   *
   * @param {String} str
   * @param {Object} opts
   * @return {Array}
   * @api private
   */

  parseArgs: function parseArgs(str, opts) {
    var reg = /"(.*?)"|'(.*?)'|`(.*?)`|([^\s"]+)/gi;
    var arr = [];
    var match = undefined;
    do {
      match = reg.exec(str);
      if (match !== null) {
        arr.push(match[1] || match[2] || match[3] || match[4]);
      }
    } while (match !== null);

    arr = minimist(arr, opts);
    arr._ = arr._ || [];
    return arr;
  },

  /**
   * Prepares a command and all its parts for execution.
   *
   * @param {String} command
   * @param {Array} commands
   * @return {Object}
   * @api public
   */

  parseCommand: function parseCommand(command, commands) {
    var self = this;
    var pipes = [];
    var match = undefined;
    var matchArgs = undefined;
    var matchParts = undefined;

    function parsePipes() {
      // First, split the command by pipes naively.
      // This will split command arguments in half when the argument contains a pipe character.
      // For example, say "(Vorpal|vorpal)" will be split into ['say "(Vorpal', 'vorpal)'] which isn't good.
      var naivePipes = String(command).trim().split('|');

      // Contruct empty array to place correctly split commands into.
      var newPipes = [];

      // We will look for pipe characters within these quotes to rejoin together.
      var quoteChars = ['"', '\'', '`'];

      // This will expand to contain one boolean key for each type of quote.
      // The value keyed by the quote is toggled off and on as quote type is opened and closed.
      // Example { "`": true, "'": false } would mean that there is an open angle quote.
      var quoteTracker = {};

      // The current command piece before being rejoined with it's over half.
      // Since it's not common for pipes to occur in commands, this is usually the entire command pipe.
      var commandPart = '';

      // Loop through each naive pipe.
      for (var key in naivePipes) {
        // It's possible/likely that this naive pipe is the whole pipe if it doesn't contain an unfinished quote.
        var possiblePipe = naivePipes[key];
        commandPart += possiblePipe;

        // Loop through each individual character in the possible pipe tracking the opening and closing of quotes.
        for (var i = 0; i < possiblePipe.length; i++) {
          var char = possiblePipe[i];
          if (quoteChars.indexOf(char) !== -1) {
            quoteTracker[char] = !quoteTracker[char];
          }
        }

        // Does the pipe end on an unfinished quote?
        var inQuote = _.some(quoteChars, function (quoteChar) {
          return quoteTracker[quoteChar];
        });

        // If the quotes have all been closed or this is the last possible pipe in the array, add as pipe.
        if (!inQuote || key * 1 === naivePipes.length - 1) {
          newPipes.push(commandPart.trim());
          commandPart = '';
        } else {
          // Quote was left open. The pipe character was previously removed when the array was split.
          commandPart += '|';
        }
      }

      // Set the first pipe to command and the rest to pipes.
      command = newPipes.shift();
      pipes = pipes.concat(newPipes);
    }

    function parseMatch() {
      matchParts = self.matchCommand(command, commands);
      match = matchParts.command;
      matchArgs = matchParts.args;
    }

    parsePipes();
    parseMatch();

    if (match && _.isFunction(match._parse)) {
      command = match._parse(command, matchParts.args);
      parsePipes();
      parseMatch();
    }

    return {
      command: command,
      match: match,
      matchArgs: matchArgs,
      pipes: pipes
    };
  },

  /**
   * Run a raw command string, e.g. foo -bar
   * against a given list of commands,
   * and if there is a match, parse the
   * results.
   *
   * @param {String} cmd
   * @param {Array} cmds
   * @return {Object}
   * @api public
   */

  matchCommand: function matchCommand(cmd, cmds) {
    var parts = String(cmd).trim().split(' ');

    var match = undefined;
    var matchArgs = undefined;
    for (var i = 0; i < parts.length; ++i) {
      var subcommand = String(parts.slice(0, parts.length - i).join(' ')).trim();
      match = _.find(cmds, { _name: subcommand }) || match;
      if (!match) {
        for (var key in cmds) {
          var _cmd = cmds[key];
          var idx = _cmd._aliases.indexOf(subcommand);
          match = idx > -1 ? _cmd : match;
        }
      }
      if (match) {
        matchArgs = parts.slice(parts.length - i, parts.length).join(' ');
        break;
      }
    }
    // If there's no command match, check if the
    // there's a `catch` command, which catches all
    // missed commands.
    if (!match) {
      match = _.find(cmds, { _catch: true });
      // If there is one, we still need to make sure we aren't
      // partially matching command groups, such as `do things` when
      // there is a command `do things well`. If we match partially,
      // we still want to show the help menu for that command group.
      if (match) {
        var allCommands = _.map(cmds, '_name');
        var wordMatch = false;
        for (var key in allCommands) {
          var _cmd2 = allCommands[key];
          var parts2 = String(_cmd2).split(' ');
          var cmdParts = String(match.command).split(' ');
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
          match = undefined;
        } else {
          matchArgs = cmd;
        }
      }
    }

    return {
      command: match,
      args: matchArgs
    };
  },

  buildCommandArgs: function buildCommandArgs(passedArgs, cmd, execCommand, isCommandArgKeyPairNormalized) {
    var args = { options: {} };

    if (isCommandArgKeyPairNormalized) {
      // Normalize all foo="bar" with "foo='bar'"
      // This helps implement unix-like key value pairs.
      var reg = /(['"]?)(\w+)=(?:(['"])((?:(?!\3).)*)\3|(\S+))\1/g;
      passedArgs = passedArgs.replace(reg, '"$2=\'$4$5\'"');
    }

    // Types are custom arg types passed
    // into `minimist` as per its docs.
    var types = cmd._types || {};

    // Make a list of all boolean options
    // registered for this command. These are
    // simply commands that don't have required
    // or optional args.
    var booleans = [];
    cmd.options.forEach(function (opt) {
      if (opt.required === 0 && opt.optional === 0) {
        if (opt.short) {
          booleans.push(opt.short);
        }
        if (opt.long) {
          booleans.push(opt.long);
        }
      }
    });

    // Review the args passed into the command,
    // and filter out the boolean list to only those
    // options passed in.
    // This returns a boolean list of all options
    // passed in by the caller, which don't have
    // required or optional args.
    var passedArgParts = passedArgs.split(' ');
    types.boolean = booleans.map(function (str) {
      return String(str).replace(/^-*/, '');
    }).filter(function (str) {
      var match = false;
      var strings = ['-' + str, '--' + str, '--no-' + str];
      for (var i = 0; i < passedArgParts.length; ++i) {
        if (strings.indexOf(passedArgParts[i]) > -1) {
          match = true;
          break;
        }
      }
      return match;
    });

    // Use minimist to parse the args.
    var parsedArgs = this.parseArgs(passedArgs, types);

    function validateArg(arg, cmdArg) {
      return !(arg === undefined && cmdArg.required === true);
    }

    // Builds varidiac args and options.
    var valid = true;
    var remainingArgs = _.clone(parsedArgs._);
    for (var l = 0; l < 10; ++l) {
      var matchArg = cmd._args[l];
      var passedArg = parsedArgs._[l];
      if (matchArg !== undefined) {
        valid = !valid ? false : validateArg(parsedArgs._[l], matchArg);
        if (!valid) {
          break;
        }
        if (passedArg && matchArg.variadic === true) {
          args[matchArg.name] = remainingArgs;
        } else if (passedArg !== undefined) {
          args[matchArg.name] = passedArg;
          remainingArgs.shift();
        }
      }
    }

    if (!valid) {
      return '\n  Missing required argument. Showing Help:';
    }

    // Looks for ommitted required options and throws help.
    for (var m = 0; m < cmd.options.length; ++m) {
      var o = cmd.options[m];
      var short = String(o.short || '').replace(/-/g, '');
      var long = String(o.long || '').replace(/--no-/g, '').replace(/^-*/g, '');
      var exist = parsedArgs[short] !== undefined ? parsedArgs[short] : undefined;
      exist = exist === undefined && parsedArgs[long] !== undefined ? parsedArgs[long] : exist;
      var existsNotSet = exist === true || exist === false;
      if (existsNotSet && o.required !== 0) {
        return '\n  Missing required value for option ' + (o.long || o.short) + '. Showing Help:';
      }
      if (exist !== undefined) {
        args.options[long || short] = exist;
      }
    }

    // Looks for supplied options that don't
    // exist in the options list.
    // If the command allows unknown options,
    // adds it, otherwise throws help.
    var passedOpts = _.chain(parsedArgs).keys().pull('_').pull('help').value();

    var _loop = function _loop(key) {
      var opt = passedOpts[key];
      var optionFound = _.find(cmd.options, function (expected) {
        if ('--' + opt === expected.long || '--no-' + opt === expected.long || '-' + opt === expected.short) {
          return true;
        }
        return false;
      });
      if (optionFound === undefined) {
        if (cmd._allowUnknownOptions) {
          args.options[opt] = parsedArgs[opt];
        } else {
          return {
            v: '\n  Invalid option: \'' + opt + '\'. Showing Help:'
          };
        }
      }
    };

    for (var key in passedOpts) {
      var _ret = _loop(key);

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }

    // If args were passed into the programmatic
    // `vorpal.exec(cmd, args, callback)`, merge
    // them here.
    if (execCommand && execCommand.args && _.isObject(execCommand.args)) {
      args = _.extend(args, execCommand.args);
    }

    // Looks for a help arg and throws help if any.
    if (parsedArgs.help || parsedArgs._.indexOf('/?') > -1) {
      args.options.help = true;
    }

    return args;
  },

  /**
   * Makes an argument name pretty for help.
   *
   * @param {String} arg
   * @return {String}
   * @api private
   */

  humanReadableArgName: function humanReadableArgName(arg) {
    var nameOutput = arg.name + (arg.variadic === true ? '...' : '');
    return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
  },

  /**
   * Formats an array to display in a TTY
   * in a pretty fashion.
   *
   * @param {Array} arr
   * @return {String}
   * @api public
   */

  prettifyArray: function prettifyArray(arr) {
    arr = arr || [];
    var arrClone = _.clone(arr);
    var width = process.stdout.columns;
    var longest = strip(arrClone.sort(function (a, b) {
      return strip(b).length - strip(a).length;
    })[0] || '').length + 2;
    var fullWidth = strip(String(arr.join(''))).length;
    var fitsOneLine = fullWidth + arr.length * 2 <= width;
    var cols = Math.floor(width / longest);
    cols = cols < 1 ? 1 : cols;
    if (fitsOneLine) {
      return arr.join('  ');
    }
    var col = 0;
    var lines = [];
    var line = '';
    for (var key in arr) {
      var arrEl = arr[key];
      if (col < cols) {
        col++;
      } else {
        lines.push(line);
        line = '';
        col = 1;
      }
      line += this.pad(arrEl, longest, ' ');
    }
    if (line !== '') {
      lines.push(line);
    }
    return lines.join('\n');
  },

  /**
   * Pads a value with with space or
   * a specified delimiter to match a
   * given width.
   *
   * @param {String} str
   * @param {Integer} width
   * @param {String} delimiter
   * @return {String}
   * @api private
   */

  pad: function pad(str, width, delimiter) {
    width = Math.floor(width);
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - strip(str).length);
    return str + Array(len + 1).join(delimiter);
  },

  // When passing down applied args, we need to turn
  // them from `{ '0': 'foo', '1': 'bar' }` into ['foo', 'bar']
  // instead.
  fixArgsForApply: function fixArgsForApply(obj) {
    if (!_.isObject(obj)) {
      if (!_.isArray(obj)) {
        return [obj];
      }
      return obj;
    }
    var argArray = [];
    for (var key in obj) {
      var aarg = obj[key];
      argArray.push(aarg);
    }
    return argArray;
  }
};

/**
 * Expose `util`.
 */

module.exports = exports = util;