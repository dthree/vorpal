// @flow

import isObject from './utils/isObject';

import type { Autocomplete, OptionOptions } from './types';

export default class Option {
  autocomplete: ?Autocomplete;
  bool: boolean;
  defaultValue: *;
  description: string;
  flags: string;
  long: string;
  optional: boolean;
  required: boolean;
  short: string;

  constructor(
    flags: string,
    description?: string = '',
    defaultOptions?: Autocomplete | OptionOptions = {},
  ) {
    let options: OptionOptions = {
      autocomplete: null,
      default: null,
    };

    if (Array.isArray(defaultOptions) || typeof defaultOptions === 'function') {
      options.autocomplete = defaultOptions;

    } else if (isObject(defaultOptions)) {
      options = {
        ...options,
        ...defaultOptions,
      };
    }

    this.autocomplete = options.autocomplete;
    this.bool = !flags.includes('-no-');
    this.defaultValue = options.default;
    this.description = description;
    this.flags = flags;
    this.long = '';
    this.optional = flags.includes('[');
    this.required = flags.includes('<');
    this.short = '';

    // Determine short and long names
    flags.split(/[ ,|]+/g).forEach((flag) => {
      if (flag.startsWith('--')) {
        this.long = flag;
      } else if (flag.startsWith('-')) {
        this.short = flag;
      }
    });
  }

  /**
   * Return the option name.
   */
  name(): string {
    if (this.long) {
      return this.long.replace('--', '').replace('no-', '');
    }

    return this.short.replace('-', '');
  }

  /**
   * Check if an argument matches the short or long flag name.
   */
  is(arg: string): boolean {
    return (arg === this.short || arg === this.long);
  }

  /**
   * Return the default value.
   */
  default(): * {
    return this.defaultValue;
  }
}
