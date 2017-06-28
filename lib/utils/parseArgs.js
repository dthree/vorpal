// @flow
import minimist from 'minimist';

import type { CLIArgs, CLIParserOptions } from 'minimist';

const ARGS_PATTERN: RegExp = /"(.*?)"|'(.*?)'|`(.*?)`|([^\s"]+)/gi;

/**
 * Parses command arguments from multiple sources.
 */
export default function parseArgs(input: string, opts?: CLIParserOptions = {}): CLIArgs {
  console.log('parseArgs()', 'input=', input, 'opts=', opts);
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
}
