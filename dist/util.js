'use strict';

/**
 * Module dependencies.
 */

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
      var newPipes = String(command).trim().split('|').map(function (itm) {
        return String(itm).trim();
      });
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
    var parts = String(cmd).trim().split('|')[0].split(' ');
    var match = undefined;
    var matchArgs = undefined;
    for (var i = 0; i < parts.length; ++i) {
      var subcommand = String(parts.slice(0, parts.length - i).join(' ')).trim();
      match = _.find(cmds, { _name: subcommand }) || match;
      if (!match) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = (0, _getIterator3.default)(cmds), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _cmd = _step.value;

            var idx = _cmd._aliases.indexOf(subcommand);
            match = idx > -1 ? _cmd : match;
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
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
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = (0, _getIterator3.default)(allCommands), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _cmd2 = _step2.value;

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
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
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

  buildCommandArgs: function buildCommandArgs(passedArgs, cmd, execCommand) {
    var args = { options: {} };

    // This basically makes the arguments human readable.
    var parsedArgs = this.parseArgs(passedArgs, cmd._types);

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
      var long = String(o.long || '').replace(/--no-/g, '').replace(/-/g, '');
      var exist = parsedArgs[short] !== undefined ? parsedArgs[short] : undefined;
      exist = exist === undefined && parsedArgs[long] !== undefined ? parsedArgs[long] : exist;
      if (!exist && o.required !== 0) {
        return '\n  Missing required option. Showing Help:';
      }
      if (exist !== undefined) {
        args.options[long || short] = exist;
      }
    }

    // Looks for supplied options that don't
    // exist in the options list and throws help
    var passedOpts = _.chain(parsedArgs).keys().pull('_').pull('help').value();
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      var _loop = function _loop() {
        var opt = _step3.value;

        var optionFound = _.find(cmd.options, function (expected) {
          if ('--' + opt === expected.long || '--no-' + opt === expected.long || '-' + opt === expected.short) {
            return true;
          }
          return false;
        });
        if (optionFound === undefined) {
          return {
            v: '\n  Invalid option: \'' + opt + '\'. Showing Help:'
          };
        }
      };

      for (var _iterator3 = (0, _getIterator3.default)(passedOpts), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var _ret = _loop();

        if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3.default)(_ret)) === "object") return _ret.v;
      }

      // If args were passed into the programmatic
      // `vorpal.exec(cmd, args, callback)`, merge
      // them here.
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

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
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = (0, _getIterator3.default)(arr), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var arrEl = _step4.value;

        if (col < cols) {
          col++;
        } else {
          lines.push(line);
          line = '';
          col = 1;
        }
        line += this.pad(arrEl, longest, ' ');
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
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
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
      for (var _iterator5 = (0, _getIterator3.default)(obj), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
        var aarg = _step5.value;

        argArray.push(aarg);
      }
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion5 && _iterator5.return) {
          _iterator5.return();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }

    return argArray;
  }
};

/**
 * Expose `util`.
 */

module.exports = exports = util;