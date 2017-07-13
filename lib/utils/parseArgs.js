// @flow
import minimist from 'minimist';

import type { CLIArgs, CLIParserOptions } from 'minimist';

const ARGS_PATTERN: RegExp = /"(.*?)"|'(.*?)'|`(.*?)`|([^\s"]+)/gi;

/**
 * Parses command arguments from multiple sources.
 */
export default function parseArgs(input: string, opts?: CLIParserOptions = {}): CLIArgs {
  let args = [];
  let match;

  do {
    match = ARGS_PATTERN.exec(input);

    if (match !== null) {
      args.push(match[1] || match[2] || match[3] || match[4]);
    }
  } while (match !== null);

  // Create clone of arr before sending to minimist, resolves #263
  var raw = arr.slice(0)

  args = minimist(args, opts);
  args._ = args._ || [];

  // Test for incorrectly interpreted number-like values from minimist, resolves #263
  arr._.forEach(function (arg, index) {
    if (arg === Infinity) arr._[index] = raw[index];
  });

  return args;
}
