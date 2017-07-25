// @flow
import Command from '../command';
import isDefined from './isDefined';
import padRow from './padRow';
import parseArgs from './parseArgs';

import type { CommandArgs, CommandExecutionItem } from '../types';

const PAIR_NORMALIZE_PATTERN: RegExp = /(['"]?)(\w+)=(?:(['"])((?:(?!\3).)*)\3|(\S+))\1/g;
const MAX_ARGS: number = 10;

// eslint-disable-next-line complexity
export default function buildCommandArgs(
  passedArgs: string,
  command: Command,
  execCommand: ?CommandExecutionItem = null,
  isCommandArgKeyPairNormalized: boolean = false
): CommandArgs {
  const args = { options: {} };

  // Normalize all foo="bar" with "foo='bar'".
  // This helps implement unix-like key value pairs.
  if (isCommandArgKeyPairNormalized) {
    // eslint-disable-next-line no-param-reassign
    passedArgs = passedArgs.replace(PAIR_NORMALIZE_PATTERN, '"$2=\'$4$5\'"');
  }

  // Types are custom arg types passed into `minimist` as per its docs.
  const types = command._types || {};

  // Make a list of all boolean options registered for this command.
  // These are simply commands that don't have required or optional args.
  const booleans = [];

  command.options.forEach((opt) => {
    if (!opt.required && !opt.optional) {
      if (opt.short) {
        booleans.push(opt.short);
      }

      if (opt.long) {
        booleans.push(opt.long);
      }
    }
  });

  // Review the args passed into the command and filter out the boolean list to only those
  // options passed in. This returns a boolean list of all options passed in by the caller,
  // which don't have required or optional args.
  types.boolean = booleans
    .map(value => String(value).replace(/^-*/, ''))
    .filter((value) => {
      const formats = [`-${value}`, `--${value}`, `--no-${value}`];

      return passedArgs.split(' ').some(part => formats.includes(part));
    });

  // Use minimist to parse the args, and then build varidiac args and options.
  const parsedArgs = parseArgs(passedArgs, types);
  const remainingArgs = [...parsedArgs._];

  // Builds varidiac args and options.
  for (let l = 0; l < MAX_ARGS; l += 1) {
    const matchArg = command._args[l];
    const passedArg = parsedArgs._[l];

    if (matchArg) {
      // Can be a falsy value
      if (isDefined(passedArg)) {
        if (matchArg.variadic) {
          args[matchArg.name] = remainingArgs;
        } else {
          args[matchArg.name] = passedArg;
          remainingArgs.shift();
        }
      } else if (matchArg.required) {
        throw new Error(padRow('\nMissing required argument. Showing Help:'));
      }
    }
  }

  // Looks for ommitted required options and throws help.
  command.options.forEach((option) => {
    const short = String(option.short || '').replace(/-/g, '');
    const long = String(option.long || '').replace(/--no-/g, '').replace(/^-*/g, '');
    const exists = isDefined(parsedArgs[long])
      ? parsedArgs[long]
      : parsedArgs[short];
    const existsNotSet = (exists === true || exists === false);
    const defaultValue = option.default();
    const hasDefault = (isDefined(defaultValue) && defaultValue !== null);

    if (existsNotSet && option.required && !hasDefault) {
      throw new Error(padRow(
        `\nMissing required value for option ${option.long || option.short}. Showing Help:`
      ));
    }

    // Can be a falsy value
    if (isDefined(exists)) {
      args.options[long || short] = exists;

    } else if (hasDefault) {
      args.options[long || short] = defaultValue;
    }
  });

  // Looks for supplied options that don't exist in the options list.
  // If the command allows unknown options, adds it, otherwise throws help.
  const passedOpts = Object.keys(parsedArgs).filter(opt => (opt !== '_' && opt !== 'help'));

  passedOpts.forEach((option) => {
    const optionFound = command.options.find(expected => (
      `--${option}` === expected.long ||
      `--no-${option}` === expected.long ||
      `-${option}` === expected.short
    ));

    if (!optionFound) {
      if (command._allowUnknownOptions) {
        args.options[option] = parsedArgs[option];
      } else {
        throw new Error(padRow(`\nInvalid option ${option}. Showing Help:`));
      }
    }
  });

  // If args were passed into the programmatic `Vorpal#exec`, merge them here.
  if (execCommand && execCommand.args && typeof execCommand.args === 'object') {
    Object.assign(args, execCommand.args);
  }

  // Looks for a help arg and throws help if any.
  if (parsedArgs.help || parsedArgs._.includes('/?')) {
    args.options.help = true;
  }

  return args;
}
