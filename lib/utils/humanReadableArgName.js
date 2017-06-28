// @flow
import type { Argument } from '../types';

/**
 * Makes an argument name pretty for help.
 */
export default function humanReadableArgName(arg: Argument): string {
  const name = arg.name + (arg.variadic ? '...' : '');

  return arg.required ? `<${name}>` : `[${name}]`;
}
