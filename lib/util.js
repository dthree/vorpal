'use strict';

/**
 * Module dependencies.
 */

var _ = require('lodash');
var minimist = require('minimist');
var strip = require('strip-ansi');

var util = {
  /**
   * Parses command arguments from multiple
   * sources.
   *
   * @param {String} value
   * @param {String} env
   * @param {String} file
   * @return {Array}
   * @api private
   */

  parseArgs: function (value, env, file) {
    var reg = /[^\s'']+|['']([^'']*)['']/gi;
    var str = value;
    var arr = [];
    var match;
    if (env) {
      arr.push(env);
    }
    if (file) {
      arr.push(file);
    }
    do {
      match = reg.exec(str);
      if (match !== null) {
        arr.push(match[1] ? match[1] : match[0]);
      }
    } while (match !== null);
    arr = minimist(arr);
    arr._ = arr._ || [];
    return arr;
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

  matchCommand: function (cmd, cmds) {
    var parts = String(cmd).trim().split(' ');
    var match;
    var matchArgs;
    for (var i = 0; i < parts.length; ++i) {
      var subcommand = String(parts.slice(0, parts.length - i).join(' ')).trim().toLowerCase();
      match = _.findWhere(cmds, {_name: subcommand}) || match;
      if (!match) {
        for (var j = 0; j < cmds.length; ++j) {
          var idx = cmds[j]._aliases.indexOf(subcommand);
          match = (idx > -1) ? cmds[j] : match;
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
      match = _.findWhere(cmds, {_catch: true});
      // If there is one, we still need to make sure we aren't
      // partially matching command groups, such as `do things` when
      // there is a command `do things well`. If we match partially,
      // we still want to show the help menu for that command group.
      if (match) {
        var allCommands = _.pluck(cmds, '_name');
        var wordMatch = false;
        for (var n = 0; n < allCommands.length; ++n) {
          var parts2 = String(allCommands[n]).split(' ');
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

    return ({
      command: match,
      args: matchArgs
    });
  },

  buildCommandArgs: function (passedArgs, cmd, execCommand) {
    var args = {options: {}};

    // This basically makes the arguments human readable.
    var parsedArgs = this.parseArgs(passedArgs);

    function validateArg(arg, cmdArg) {
      return !(arg === undefined && cmdArg.required === true);
    }

    // Builds varidiac args and options.
    var valid = true;
    var remainingArgs = _.clone(parsedArgs._);
    for (var l = 0; l < 10; ++l) {
      var matchArg = cmd._args[l];
      var passedArg = parsedArgs._[l];
      if (matchArg) {
        valid = (!valid) ? false : validateArg(parsedArgs._[l], matchArg);
        if (!valid) {
          break;
        }
        if (passedArg && matchArg.variadic === true) {
          args[matchArg.name] = remainingArgs;
        } else if (passedArg) {
          args[matchArg.name] = passedArg;
          remainingArgs.shift();
        }
      }
    }

    if (!valid) {
      return '\n  Missing required argument. Showing Help:';
    }

    // Looks for ommitted required options
    // and throws help.
    for (var m = 0; m < cmd.options.length; ++m) {
      var o = cmd.options[m];
      var short = String(o.short || '').replace(/-/g, '');
      var long = String(o.long || '').replace(/--no-/g, '').replace(/-/g, '');
      var exist = parsedArgs[short] || parsedArgs[long];
      if (exist === true && o.required !== 0) {
        return '\n  Missing required option. Showing Help:';
      }
      if (exist !== undefined) {
        args.options[long || short] = exist;
      }
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

  humanReadableArgName: function (arg) {
    var nameOutput = arg.name + (arg.variadic === true ? '...' : '');
    return arg.required ?
      '<' + nameOutput + '>' :
      '[' + nameOutput + ']';
  },

  /**
   * Formats an array to display in a TTY
   * in a pretty fashion.
   *
   * @param {Array} arr
   * @return {String}
   * @api public
   */

  prettifyArray: function (arr) {
    arr = arr || [];
    var arrClone = _.clone(arr);
    var width = process.stdout.columns;
    var longest = strip((arrClone.sort(function (a, b) {
      return strip(b).length - strip(a).length;
    })[0] || '')).length + 2;
    var fullWidth = strip(String(arr.join(''))).length;
    var fitsOneLine = ((fullWidth + (arr.length * 2)) <= width);
    var cols = Math.floor(width / longest);
    cols = (cols < 1) ? 1 : cols;
    if (fitsOneLine) {
      return arr.join('  ');
    }
    var col = 1;
    var lines = [];
    var line = '';
    for (var i = 0; i < arr.length; ++i) {
      if (col < cols) {
        col++;
      } else {
        lines.push(line);
        line = '';
        col = 1;
      }
      line += this.pad(arr[i], longest, ' ');
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

  pad: function (str, width, delimiter) {
    width = Math.floor(width);
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(delimiter);
  },

  // When passing down applied args, we need to turn
  // them from `{ '0': 'foo', '1': 'bar' }` into ['foo', 'bar']
  // instead.
  fixArgsForApply: function (obj) {
    if (!_.isObject(obj)) {
      if (!_.isArray(obj)) {
        return [obj];
      }
      return obj;
    }
    var argArray = [];
    _.each(obj, function (aarg) {
      argArray.push(aarg);
    });
    return argArray;
  }
};

/**
 * Expose `util`.
 */

module.exports = exports = util;
