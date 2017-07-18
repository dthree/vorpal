// @flow

import EventEmitter from 'events';
import Option from './Option';
// import camelCase from './utils/camelCase';
import humanReadableArgName from './utils/humanReadableArgName';
import pad from './utils/pad';
import padRow from './utils/padRow';

import type {
  ActionCallback,
  Argument,
  Autocomplete,
  CancelCallback,
  DoneCallback,
  HelpCallback,
  InitCallback,
  OptionOptions,
  ParseCallback,
  UseCallback,
  ValidateCallback,
} from './types';

const VARIADIC_LENGTH: number = 3;

export default class Command extends EventEmitter {
  commands: Command[];
  options: Option[];
  _allowUnknownOptions: boolean;
  _aliases: string[];
  _args: Argument[];
  _autocomplete: ?Autocomplete;
  _cancel: ?CancelCallback;
  _catch: boolean;
  _delimiter: string;
  _description: string;
  _done: ?DoneCallback;
  _fn: ?ActionCallback;
  _help: ?HelpCallback;
  _hidden: boolean;
  _init: ?InitCallback;
  _mode: boolean;
  _name: string;
  _parent: Command;
  _parse: ?ParseCallback;
  _types: {
    boolean?: string[],
    string?: string[],
  };
  _usage: string;
  _validate: ?ValidateCallback;

  constructor(name: string, parent: Command) {
    super();

    this.commands = [];
    this.options = [];
    this._allowUnknownOptions = false;
    this._aliases = [];
    this._args = [];
    this._autocomplete = null;
    this._catch = false;
    this._delimiter = '';
    this._description = '';
    this._done = null;
    this._fn = null;
    this._help = null;
    this._hidden = false;
    this._init = null;
    this._mode = false;
    this._name = name;
    this._parent = parent;
    this._parse = null;
    this._types = {};
    this._usage = '';
    this._validate = null;
  }

  /**
   * Defines an action for a given command.
   */
  action(callback: ActionCallback): this {
    this._fn = callback;

    return this;
  }

  /**
   * Defines an alias for a given command.
   */
  alias(...aliases: string[]): this {
    aliases.forEach((alias) => {
      if (Array.isArray(alias)) {
        this.alias(...alias);

        return;
      }

      this._parent.commands.forEach((command) => {
        if (command._aliases.includes(alias)) {
          throw new Error(
            `Duplicate alias "${alias}" for command "${this._name}" detected. ` +
            `Was first reserved by command "${command._name}".`,
          );
        }
      });

      this._aliases.push(alias);
    });

    return this;
  }

  /**
   * Allows undeclared options to be passed in with the command.
   */
  allowUnknownOptions(allow: boolean = true): this {
    this._allowUnknownOptions = allow;

    return this;
  }

  /**
   * Defines tabbed auto-completion for the given command.
   */
  autocomplete(autocomplete: Autocomplete): this {
    this._autocomplete = autocomplete;

    return this;
  }

  /**
   * Defines a function to be called when the command is canceled.
   */
  cancel(callback: CancelCallback): this {
    this._cancel = callback;

    return this;
  }

  /**
   * Defines a prompt delimiter for a mode once entered.
   */
  delimiter(delimiter: string): this {
    this._delimiter = delimiter;

    return this;
  }

  /**
   * Defines description for given command.
   */
  description(description: string): this {
    this._description = description;

    return this;
  }

  /**
   * Defines a method to be called when the command set has completed.
   */
  done(callback: DoneCallback): this {
    this._done = callback;

    return this;
  }

  /**
   * Adds a custom handling for the --help flag.
   */
  help(callback: HelpCallback): this {
    this._help = callback;

    return this;
  }

  /**
   * Doesn't show command in the help menu.
   */
  hidden(): this {
    this._hidden = true;

    return this;
  }

  /**
   * Defines an init action for a mode command.
   */
  init(callback: InitCallback): this {
    if (!this._mode) {
      throw new Error('Cannot call init from a non-mode action.');
    }

    this._init = callback;

    return this;
  }

  /**
   * Registers an option for given command.
   */
  option(
    flags: string,
    description?: string = '',
    options?: Autocomplete | OptionOptions = {},
  ) {
    const option = new Option(flags, description, options);
    // const name = camelCase(option.name());
    // let defaultValue;
    //
    // // Pre-aassign default value only for --no-*, [optional], or <required>
    // if (!option.bool || option.optional || option.required) {
    //   // When --no-* we make sure default is true
    //   if (!option.bool) {
    //     defaultValue = true;
    //   }
    //
    //   // Pre-assign only if we have a default
    //   if (typeof defaultValue !== 'undefined') {
    //     this[name] = defaultValue;
    //   }
    // }

    // Register the option
    this.options.push(option);

    // TODO - What is this? Is this still needed?
    // When it's passed, assign the value and conditionally invoke the callback
    // this.on(option.name(), (value) => {
    //   if (typeof this[name] === 'boolean' || typeof this[name] === 'undefined') {
    //     // if no value, bool true, and we have a default, then use it!
    //     if (value === null) {
    //       this[name] = option.bool ? (defaultValue || true) : false;
    //     } else {
    //       this[name] = value;
    //     }
    //   } else if (value !== null) {
    //     this[name] = value;
    //   }
    // });

    return this;
  }

  /**
   * Edits the raw command string before it is executed.
   */
  parse(callback: ParseCallback): this {
    this._parse = callback;

    return this;
  }

  /**
   * Removes self from Vorpal instance.
   */
  remove(): this {
    this._parent.commands = this._parent.commands.filter(command => (
      command._name !== this._name
    ));

    return this;
  }

  /**
   * Returns the help info for given command.
   */
  renderHelp(): string {
    const output = [];

    if (this._description) {
      output.push(
        this._description,
        '',
      );
    }

    if (this._aliases.length > 0) {
      output.push(
        `Alias: ${this._aliases.join(' | ')}`,
        '',
      );
    }

    const usage = this._usage || [
      '[options]',
      this.commands.length ? '[command]' : '',
      this._args.length ? this._args.map(arg => humanReadableArgName(arg)).join(' ') : '',
    ].join(' ');

    const width = this._largestOptionLength();
    const options = [`${pad('--help', width)} output usage information`]
      .concat(this.options.map(option => (
        `${pad(option.flags, width)} ${option.description}`
      )))
      .join('\n');

    output.push(
      '',
      `Usage: ${this._name} ${usage}`,
      '',
      'Options:',
      '',
      padRow(options),
      '',
    );

    return output
      .map(padRow)
      .join('\n')
      .replace(/\n\n\n/g, '\n\n');
  }

  /**
   * Returns the command usage string for help.
   */
  usage(usage: string): this {
    this._usage = usage;

    return this;
  }

  /**
   * Let's you compose other funtions to extend the command.
   */
  use(callback: UseCallback): this {
    callback(this);

    return this;
  }

  /**
   * Defines a function to validate arguments before an action is performed.
   * Arguments are valid if no errors are thrown from the function.
   */
  validate(callback: ValidateCallback): this {
    this._validate = callback;

    return this;
  }

  /**
   * Returns the length of the longest option.
   */
  _largestOptionLength(): number {
    return this.options.reduce((max, option) => Math.max(max, option.flags.length), 0);
  }

  /**
   * Parses and returns expected command arguments.
   */
  _parseExpectedArgs(args: string[]): this {
    if (!args || args.length === 0) {
      return this;
    }

    args.forEach((arg) => {
      const argDetails = {
        name: '',
        required: false,
        variadic: false,
      };

      switch (arg[0]) {
        case '<':
          argDetails.required = true;
          argDetails.name = arg.slice(1, -1);
          break;

        case '[':
          argDetails.name = arg.slice(1, -1);
          break;

        default:
          break;
      }

      if (
        argDetails.name.length > VARIADIC_LENGTH &&
        argDetails.name.slice(-VARIADIC_LENGTH) === '...'
      ) {
        argDetails.variadic = true;
        argDetails.name = argDetails.name.slice(0, -VARIADIC_LENGTH);
      }

      if (argDetails.name) {
        this._args.push(argDetails);
      }
    });

    // If the user entered args in a weird order, properly sequence them
    if (this._args.length > 1) {
      this._args.sort((a, b) => {
        if (a.required && !b.required) {
          return -1;
        } else if (b.required && !a.required) {
          return 1;
        } else if (a.variadic && !b.variadic) {
          return 1;
        } else if (b.variadic && !a.variadic) {
          return -1;
        }

        return 0;
      });
    }

    return this;
  }
}
