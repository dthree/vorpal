// @flow

import _ from 'lodash';
import strip from 'strip-ansi';

/**
 * Independent / stateless auto-complete function.
 * Parses an array of strings for the best match.
 *
 * @param {String} str
 * @param {Array} arr
 * @return {String}
 * @api private
 */
const match = (str: string, arr = [], options = {}): void | string | string[] => {
  arr.sort();
  const arrX = _.clone(arr);
  let strX = String(str);

  let prefix = '';

  if (options.ignoreSlashes !== true) {
    const parts = strX.split('/');
    strX = parts.pop();
    prefix = parts.join('/');
    prefix = parts.length > 0 ? `${prefix}/` : prefix;
  }

  const matches = [];
  for (let i = 0; i < arrX.length; i += 1) {
    if (strip(arrX[i]).slice(0, strX.length) === strX) {
      matches.push(arrX[i]);
    }
  }

  if (matches.length === 1) {
    // If we have a slash, don't add a space after match.
    const space = (String(strip(matches[0])).slice(strip(matches[0]).length - 1) === '/') ? '' : ' ';

    return prefix + matches[0] + space;
  } else if (matches.length === 0) {

    return undefined;
  } else if (strX.length === 0) {

    return matches;
  }

  const longestMatchLength = matches
    .reduce((previous, current) => {
      for (let i = 0; i < current.length; i += 1) {
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
};

/**
 * Tracks how many times tab was pressed
 * based on whether the UI changed.
 *
 * @param {String} str
 * @return {String} result
 * @api private
 */

function handleTabCounts(str: string | Array<string>, freezeTabs: boolean): | string
  | Array<string>
  | void {
  let result;
  if (_.isArray(str)) {
    this._tabCtr += 1;
    if (this._tabCtr > 1) {
      result = ((str.length === 0) ? undefined : str);
    }
  } else {
    this._tabCtr = (freezeTabs === true) ? this._tabCtr + 1 : 0;
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

function getMatch(ctx: string, data: Array<string>, options?: Object): void | string | string[] {
  // Look for a command match, eliminating and then
  // re-introducing leading spaces.
  const len = ctx.length;
  const trimmed = ctx.replace(/^\s+/g, '');
  const matchResult = match(trimmed, data.slice(), options);
  if (_.isArray(matchResult)) {
    return matchResult;
  }
  const prefix = new Array((len - trimmed.length) + 1).join(' ');
  // If we get an autocomplete match on a command, finish it.
  if (matchResult && typeof matchResult === 'string') {
    // Put the leading spaces back in.
    return `${prefix}${matchResult}`;
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

function assembleInput(input: Object) {
  if (_.isArray(input.context)) {
    return input.context;
  }
  const result =
    (input.prefix || '') +
    (input.context || '') +
    (input.suffix || '');

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
function filterData(str: string = '', data: Array<string> = []) {
  let ctx = String(str || '').trim();
  const slashParts = ctx.split('/');
  ctx = slashParts.pop();
  const wordParts = String(ctx).trim().split(' ');

  return data
    .filter(item => (strip(item).slice(0, ctx.length) === ctx))
    .map((item) => {
      const parts = String(item).trim().split(' ');

      return parts.length > 1 ?
        parts.slice(wordParts.length).join(' ') :
        item;
    });
}

/**
 * Returns a cleaned up version of the
 * remaining text to the right of the cursor.
 *
 * @param {String} suffix
 * @return {String}
 * @api private
 */

function getSuffix(suffix: string) {
  let cleanSuffix = (suffix.slice(0, 1) === ' ') ?
    suffix :
    suffix.replace(/.+?(?=\s)/, '');
  cleanSuffix = cleanSuffix.slice(1, cleanSuffix.length);

  return cleanSuffix;
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

function parseInput(str: string, idx: number): Object {
  const raw = String(str || '');
  const sliced = raw.slice(0, idx);
  const sections = sliced.split('|');
  let prefix = (sections.slice(0, sections.length - 1) || []);
  prefix.push('');
  prefix = prefix.join('|');
  const suffix = getSuffix(raw.slice(idx));
  const context = sections[sections.length - 1];

  return { raw, prefix, suffix, context };
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

function parseMatchSection(obj: Object) {
  const input = obj;
  const parts = (input.context || '').split(' ');
  const last = parts.pop();
  const beforeLast = strip(parts[parts.length - 1] || '').trim();
  if (beforeLast.slice(0, 1) === '-') {
    input.option = beforeLast;
  }
  input.context = last;
  input.prefix = `${input.prefix || ''}${parts.join(' ')} `;

  return input;
}

/**
 * Compile all available commands and aliases
 * in alphabetical order.
 *
 * @param {Array} cmds
 * @return {Array}
 * @api private
 */

function getCommandNames(cmds: Array<mixed>) {
  let commands = _.map(cmds, '_name');
  commands = [...commands, _.map(cmds, '_aliases')];
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

function getMatchObject(obj: Object, commands: Array<string>) {
  const input = obj;
  const len = input.context.length;
  const trimmed = String(input.context).replace(/^\s+/g, '');
  let prefix = new Array((len - trimmed.length) + 1).join(' ');
  let matchStr;
  let suffix;
  commands.forEach((cmd) => {
    const nextChar = trimmed.substr(cmd.length, 1);
    if (trimmed.substr(0, cmd.length) === cmd && String(cmd).trim() !== '' && nextChar === ' ') {
      matchStr = cmd;
      suffix = trimmed.substr(cmd.length);
      prefix += trimmed.substr(0, cmd.length);
    }
  });

  let matchObject = (matchStr) ?
    _.find(this.parent.commands, { _name: String(match).trim() }) :
    undefined;

  if (!matchObject) {
    this.parent.commands.forEach((cmd) => {
      if ((cmd._aliases || []).indexOf(String(match).trim()) > -1) {
        matchObject = cmd;
      }
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

function getMatchData(input: Object, cb: (Array<string>) => void) {
  const string = input.context;
  const cmd = input.match;
  const midOption = (String(string).trim().slice(0, 1) === '-');
  const afterOption = (input.option !== undefined);
  if (midOption === true) {
    const results = [];
    for (let i = 0; i < cmd.options.length; ++i) { // eslint-disable-line no-plusplus
      const { long, short } = cmd.options[i];
      if (!long && short) {
        results.push(short);
      } else if (long) {
        results.push(long);
      }
    }
    cb(results);

    return;
  }

  function handleDataFormat(str: string, config: any, callback: (Array<string>) => void) {
    let data = [];
    if (_.isArray(config)) {
      data = config;
    } else if (_.isFunction(config)) {
      /**
       * NOTE: I don't currently understand/see a reason for these length < 2 checks, but I don't
       * want to change logic now. We need to revisit.
       * -- @newoga
       */
      const cbk = (config.length < 2) ? () => {} : (function (res: Array<string>) {
        callback(res || []);
      });
      const res = config(str, cbk);
      if (res && _.isFunction(res.then)) {
        res.then((resp) => {
          callback(resp);
        }).catch((err) => {
          callback(err);
        });
      } else if (config.length < 2) {
        callback(res);
      }

      return;
    }
    callback(data);

  }

  if (afterOption === true) {
    const opt = strip(input.option).trim();
    const shortMatch = _.find(cmd.options, { short: opt });
    const longMatch = _.find(cmd.options, { long: opt });
    const matchObj = longMatch || shortMatch;
    if (matchObj) {
      const config = matchObj.autocomplete;
      handleDataFormat(string, config, cb);
    }
  }

  let conf = cmd._autocomplete;
  conf = (conf && conf.data) ? conf.data : conf;
  handleDataFormat(string, conf, cb);
}

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
function exec(str: string, cb: (?Error, void | string | Array<string>) => void) {
  const self = this;
  let input = parseInput(str, this.parent.ui._activePrompt.screen.rl.cursor);
  const commands = getCommandNames(this.parent.commands);
  const vorpalMatch = getMatch(input.context, commands, { ignoreSlashes: true });
  let freezeTabs = false;

  function end(str2: string | Array<string>) {
    const res = handleTabCounts.call(self, str2, freezeTabs);
    cb(undefined, res);
  }

  function evaluateTabs(input2: Object) {
    if (input2.context && input.context[input2.context.length - 1] === '/') {
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
    getMatchData.call(self, input, (data) => {
      const dataMatch = getMatch(input.context, data);
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
}

export default { exec, match };
