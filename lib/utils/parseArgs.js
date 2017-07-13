// @flow
import minimist from 'minimist';

import type { CLIArgs, CLIParserOptions } from 'minimist';

const ARGS_PATTERN: RegExp = /"(.*?)"|'(.*?)'|`(.*?)`|([^\s"]+)/gi;

/**
 * Parses command arguments from multiple sources.
 */
export default function parseArgs(input: string, opts?: CLIParserOptions = {}, disableTypeCasting?: boolean = false): CLIArgs {
  let args = [];
  let match;

  do {
    match = ARGS_PATTERN.exec(input);

    if (match !== null) {
      args.push(match[1] || match[2] || match[3] || match[4]);
    }
  } while (match !== null);

  if (!opts.string) opts.string = [];
  if (disableTypeCasting) opts.string.push('_');

  let newArgs = minimist(args, opts);

  if (disableTypeCasting) {
    // Now that we have the full list of arguments in `newArgs`, disable type-casting
    // for all of them by adding them to opts.string. Then run minimist a second
    // time with this type casting disabled.
    let doSecondPass = false;
    for (let n in newArgs) {
      if (!newArgs.hasOwnProperty(n)) continue;
      if (opts.boolean && opts.boolean.indexOf(n) >= 0) continue;
      if (n == '_') continue;
      opts.string.push(n);
      doSecondPass = true;
    }

    if (doSecondPass) newArgs = minimist(args, opts);
  }

  args = newArgs;

  args._ = args._ || [];

  return args;
}
