const minimist = require('minimist');

const ARGS_PATTERN = /"(.*?)"|'(.*?)'|`(.*?)`|([^\s"]+)/gi;

/**
 * Parses command arguments from multiple sources.
 */
module.exports = function parseArgs(input, opts = {}) {
  let args = [];
  let match;

  do {
    match = ARGS_PATTERN.exec(input);

    if (match !== null) {
      args.push(match[1] || match[2] || match[3] || match[4]);
    }
  } while (match !== null);

  args = minimist(args, opts);
  args._ = args._ || [];

  return args;
};
