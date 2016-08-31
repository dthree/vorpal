'use strict';

var _ = require('lodash');
var strip = require('strip-ansi');

var autocomplete = {

  /**
   * Handles tabbed autocompletion.
   *
   * - Initial tabbing lists all registered commands.
   * - Completes a command halfway typed.
   * - Recognizes options and lists all possible options.
   * - Recognizes option arguments and lists them.
   * - Supports cursor positions anywhere in the string.
   * - Supports piping.
   *
   * @param {String} str
   * @return {String} cb
   * @api public
   */

  exec: function exec(str, cb) {
    var self = this;
    var input = parseInput(str, this.parent.ui._activePrompt.screen.rl.cursor);
    var commands = getCommandNames(this.parent.commands);
    var vorpalMatch = getMatch(input.context, commands, { ignoreSlashes: true });
    var freezeTabs = false;

    function end(str) {
      var res = handleTabCounts.call(self, str, freezeTabs);
      cb(undefined, res);
    }

    function evaluateTabs(input) {
      if (input.context && input.context[input.context.length - 1] === '/') {
        freezeTabs = true;
      }
    }

    if (vorpalMatch) {
      input.context = vorpalMatch;
      evaluateTabs(input);
      end(assembleInput(input));
      return;
    }

    input = getMatchObject.call(this, input, commands);
    if (input.match) {
      input = parseMatchSection.call(this, input);
      getMatchData.call(self, input, function (data) {
        var dataMatch = getMatch(input.context, data);
        if (dataMatch) {
          input.context = dataMatch;
          evaluateTabs(input);
          end(assembleInput(input));
          return;
        }
        end(filterData(input.context, data));
      });
      return;
    }
    end(filterData(input.context, commands));
  },

  /**
   * Independent / stateless auto-complete function.
   * Parses an array of strings for the best match.
   *
   * @param {String} str
   * @param {Array} arr
   * @return {String}
   * @api private
   */

  match: function match(str, arr, options) {
    arr = arr || [];
    options = options || {};
    arr.sort();
    var arrX = _.clone(arr);
    var strX = String(str);

    var prefix = '';

    if (options.ignoreSlashes !== true) {
      var parts = strX.split('/');
      strX = parts.pop();
      prefix = parts.join('/');
      prefix = parts.length > 0 ? prefix + '/' : prefix;
    }

    var matches = [];
    for (var i = 0; i < arrX.length; i++) {
      if (strip(arrX[i]).slice(0, strX.length) === strX) {
        matches.push(arrX[i]);
      }
    }
    if (matches.length === 1) {
      // If we have a slash, don't add a space after match.
      var space = String(strip(matches[0])).slice(strip(matches[0]).length - 1) === '/' ? '' : ' ';
      return prefix + matches[0] + space;
    } else if (matches.length === 0) {
      return undefined;
    } else if (strX.length === 0) {
      return matches;
    }

    var longestMatchLength = matches.reduce(function (previous, current) {
      for (var i = 0; i < current.length; i++) {
        if (previous[i] && current[i] !== previous[i]) {
          return current.substr(0, i);
        }
      }
      return previous;
    }).length;

    // couldn't resolve any further, return all matches
    if (longestMatchLength === strX.length) {
      return matches;
    }

    // return the longest matching portion along with the prefix
    return prefix + matches[0].substr(0, longestMatchLength);
  }
};

/**
 * Tracks how many times tab was pressed
 * based on whether the UI changed.
 *
 * @param {String} str
 * @return {String} result
 * @api private
 */

function handleTabCounts(str, freezeTabs) {
  var result;
  if (_.isArray(str)) {
    this._tabCtr += 1;
    if (this._tabCtr > 1) {
      result = str.length === 0 ? undefined : str;
    }
  } else {
    this._tabCtr = freezeTabs === true ? this._tabCtr + 1 : 0;
    result = str;
  }
  return result;
}

/**
 * Looks for a potential exact match
 * based on given data.
 *
 * @param {String} ctx
 * @param {Array} data
 * @return {String}
 * @api private
 */

function getMatch(ctx, data, options) {
  // Look for a command match, eliminating and then
  // re-introducing leading spaces.
  var len = ctx.length;
  var trimmed = ctx.replace(/^\s+/g, '');
  var match = autocomplete.match(trimmed, data.slice(), options);
  if (_.isArray(match)) {
    return match;
  }
  var prefix = new Array(len - trimmed.length + 1).join(' ');
  // If we get an autocomplete match on a command, finish it.
  if (match) {
    // Put the leading spaces back in.
    match = prefix + match;
    return match;
  }
  return undefined;
}

/**
 * Takes the input object and assembles
 * the final result to display on the screen.
 *
 * @param {Object} input
 * @return {String}
 * @api private
 */

function assembleInput(input) {
  if (_.isArray(input.context)) {
    return input.context;
  }
  var result = (input.prefix || '') + (input.context || '') + (input.suffix || '');
  return strip(result);
}

/**
 * Reduces an array of possible
 * matches to list based on a given
 * string.
 *
 * @param {String} str
 * @param {Array} data
 * @return {Array}
 * @api private
 */

function filterData(str, data) {
  data = data || [];
  var ctx = String(str || '').trim();
  var slashParts = ctx.split('/');
  ctx = slashParts.pop();
  var wordParts = String(ctx).trim().split(' ');
  var res = data.filter(function (item) {
    return strip(item).slice(0, ctx.length) === ctx;
  });
  res = res.map(function (item) {
    var parts = String(item).trim().split(' ');
    if (parts.length > 1) {
      parts = parts.slice(wordParts.length);
      return parts.join(' ');
    }
    return item;
  });
  return res;
}

/**
 * Takes the user's current prompt
 * string and breaks it into its
 * integral parts for analysis and
 * modification.
 *
 * @param {String} str
 * @param {Integer} idx
 * @return {Object}
 * @api private
 */

function parseInput(str, idx) {
  var raw = String(str || '');
  var sliced = raw.slice(0, idx);
  var sections = sliced.split('|');
  var prefix = sections.slice(0, sections.length - 1) || [];
  prefix.push('');
  prefix = prefix.join('|');
  var suffix = getSuffix(raw.slice(idx));
  var context = sections[sections.length - 1];
  return {
    raw: raw,
    prefix: prefix,
    suffix: suffix,
    context: context
  };
}

/**
 * Takes the context after a
 * matched command and figures
 * out the applicable context,
 * including assigning its role
 * such as being an option
 * parameter, etc.
 *
 * @param {Object} input
 * @return {Object}
 * @api private
 */

function parseMatchSection(input) {
  var parts = (input.context || '').split(' ');
  var last = parts.pop();
  var beforeLast = strip(parts[parts.length - 1] || '').trim();
  if (beforeLast.slice(0, 1) === '-') {
    input.option = beforeLast;
  }
  input.context = last;
  input.prefix = (input.prefix || '') + parts.join(' ') + ' ';
  return input;
}

/**
 * Returns a cleaned up version of the
 * remaining text to the right of the cursor.
 *
 * @param {String} suffix
 * @return {String}
 * @api private
 */

function getSuffix(suffix) {
  suffix = suffix.slice(0, 1) === ' ' ? suffix : suffix.replace(/.+?(?=\s)/, '');
  suffix = suffix.slice(1, suffix.length);
  return suffix;
}

/**
 * Compile all available commands and aliases
 * in alphabetical order.
 *
 * @param {Array} cmds
 * @return {Array}
 * @api private
 */

function getCommandNames(cmds) {
  var commands = _.map(cmds, '_name');
  commands = commands.concat.apply(commands, _.map(cmds, '_aliases'));
  commands.sort();
  return commands;
}

/**
 * When we know that we've
 * exceeded a known command, grab
 * on to that command and return it,
 * fixing the overall input context
 * at the same time.
 *
 * @param {Object} input
 * @param {Array} commands
 * @return {Object}
 * @api private
 */

function getMatchObject(input, commands) {
  var len = input.context.length;
  var trimmed = String(input.context).replace(/^\s+/g, '');
  var prefix = new Array(len - trimmed.length + 1).join(' ');
  var match;
  var suffix;
  commands.forEach(function (cmd) {
    var nextChar = trimmed.substr(cmd.length, 1);
    if (trimmed.substr(0, cmd.length) === cmd && String(cmd).trim() !== '' && nextChar === ' ') {
      match = cmd;
      suffix = trimmed.substr(cmd.length);
      prefix += trimmed.substr(0, cmd.length);
    }
  });

  var matchObject = match ? _.find(this.parent.commands, { _name: String(match).trim() }) : undefined;

  if (!matchObject) {
    this.parent.commands.forEach(function (cmd) {
      if ((cmd._aliases || []).indexOf(String(match).trim()) > -1) {
        matchObject = cmd;
      }
      return;
    });
  }

  if (!matchObject) {
    matchObject = _.find(this.parent.commands, { _catch: true });
    if (matchObject) {
      suffix = input.context;
    }
  }

  if (!matchObject) {
    prefix = input.context;
    suffix = '';
  }

  if (matchObject) {
    input.match = matchObject;
    input.prefix += prefix;
    input.context = suffix;
  }
  return input;
}

/**
 * Takes a known matched command, and reads
 * the applicable data by calling its autocompletion
 * instructions, whether it is the command's
 * autocompletion or one of its options.
 *
 * @param {Object} input
 * @param {Function} cb
 * @return {Array}
 * @api private
 */

function getMatchData(input, cb) {
  var string = input.context;
  var cmd = input.match;
  var midOption = String(string).trim().slice(0, 1) === '-';
  var afterOption = input.option !== undefined;
  if (midOption === true) {
    var results = [];
    for (var i = 0; i < cmd.options.length; ++i) {
      var long = cmd.options[i].long;
      var short = cmd.options[i].short;
      if (!long && short) {
        results.push(short);
      } else if (long) {
        results.push(long);
      }
    }
    cb(results);
    return;
  }

  function handleDataFormat(str, config, callback) {
    var data = [];
    if (_.isArray(config)) {
      data = config;
    } else if (_.isFunction(config)) {
      var cbk = config.length < 2 ? function () {} : function (res) {
        callback(res || []);
      };
      var res = config(str, cbk);
      if (res && _.isFunction(res.then)) {
        res.then(function (resp) {
          callback(resp);
        }).catch(function (err) {
          callback(err);
        });
      } else if (config.length < 2) {
        callback(res);
      }
      return;
    }
    callback(data);
    return;
  }

  if (afterOption === true) {
    var opt = strip(input.option).trim();
    var shortMatch = _.find(cmd.options, { short: opt });
    var longMatch = _.find(cmd.options, { long: opt });
    var match = longMatch || shortMatch;
    if (match) {
      var config = match.autocomplete;
      handleDataFormat(string, config, cb);
      return;
    }
  }

  var conf = cmd._autocomplete;
  conf = conf && conf.data ? conf.data : conf;
  handleDataFormat(string, conf, cb);
  return;
}

module.exports = autocomplete;