'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const minimist = require('minimist');
const strip = require('strip-ansi');

import matchCommand from './utils/matchCommand';
import pad from './utils/pad';
import parseArgs from './utils/parseArgs';

const util = {

  buildCommandArgs: function (passedArgs, cmd, execCommand, isCommandArgKeyPairNormalized) {
    let args = {options: {}};

    if(isCommandArgKeyPairNormalized) {
      // Normalize all foo="bar" with "foo='bar'"
      // This helps implement unix-like key value pairs.
      const reg = /(['"]?)(\w+)=(?:(['"])((?:(?!\3).)*)\3|(\S+))\1/g;
      passedArgs = passedArgs.replace(reg, `"$2='$4$5'"`);
    }

    // Types are custom arg types passed
    // into `minimist` as per its docs.
    const types = cmd._types || {};

    // Make a list of all boolean options
    // registered for this command. These are
    // simply commands that don't have required
    // or optional args.
    const booleans = [];
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
    const passedArgParts = passedArgs.split(' ');
    types.boolean = booleans.map(function (str) {
      return String(str).replace(/^-*/, '');
    }).filter(function (str) {
      let match = false;
      let strings = [`-${str}`, `--${str}`, `--no-${str}`];
      for (let i = 0; i < passedArgParts.length; ++i) {
        if (strings.indexOf(passedArgParts[i]) > -1) {
          match = true;
          break;
        }
      }
      return match;
    });

    // Use minimist to parse the args.
    const parsedArgs = parseArgs(passedArgs, types);

    function validateArg(arg, cmdArg) {
      return !(arg === undefined && cmdArg.required === true);
    }

    // Builds varidiac args and options.
    let valid = true;
    const remainingArgs = _.clone(parsedArgs._);
    for (let l = 0; l < 10; ++l) {
      const matchArg = cmd._args[l];
      const passedArg = parsedArgs._[l];
      if (matchArg !== undefined) {
        valid = (!valid) ? false : validateArg(parsedArgs._[l], matchArg);
        if (!valid) {
          break;
        }
        if (passedArg !== undefined) {
          if (matchArg.variadic === true) {
            args[matchArg.name] = remainingArgs;
          } else {
            args[matchArg.name] = passedArg;
            remainingArgs.shift();
          }
        }
      }
    }

    if (!valid) {
      return '\n  Missing required argument. Showing Help:';
    }

    // Looks for ommitted required options and throws help.
    for (let m = 0; m < cmd.options.length; ++m) {
      const o = cmd.options[m];
      const short = String(o.short || '').replace(/-/g, '');
      const long = String(o.long || '').replace(/--no-/g, '').replace(/^-*/g, '');
      let exist = (parsedArgs[short] !== undefined) ? parsedArgs[short] : undefined;
      exist = (exist === undefined && parsedArgs[long] !== undefined) ? parsedArgs[long] : exist;
      const existsNotSet = (exist === true || exist === false);
      const defaultValue = o.default();

      if (existsNotSet && o.required !== 0 && ! defaultValue) {
        return `\n  Missing required value for option ${(o.long || o.short)}. Showing Help:`;
      }
      if (exist !== undefined) {
        args.options[long || short] = exist;
      } else if (defaultValue) {
        args.options[long || short] = defaultValue;
      }
    }

    // Looks for supplied options that don't
    // exist in the options list.
    // If the command allows unknown options,
    // adds it, otherwise throws help.
    const passedOpts = _.chain(parsedArgs)
      .keys()
      .pull('_')
      .pull('help')
      .value();
    for (const key in passedOpts) {
      const opt = passedOpts[key];
      const optionFound = _.find(cmd.options, function (expected) {
        if ('--' + opt === expected.long ||
            '--no-' + opt === expected.long ||
            '-' + opt === expected.short) {
          return true;
        }
        return false;
      });
      if (optionFound === undefined) {
        if (cmd._allowUnknownOptions) {
          args.options[opt] = parsedArgs[opt];
        } else {
          return `\n  Invalid option: '${opt}'. Showing Help:`;
        }
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
};

/**
 * Expose `util`.
 */

module.exports = exports = util;
