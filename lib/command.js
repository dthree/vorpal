const { EventEmitter } = require('events');
const Option = require('./option');
import camelCase from './utils/camelCase';
import humanReadableArgName from './utils/humanReadableArgName';
import pad from './utils/pad';

const VARIADIC_LENGTH = 3;

export default class Command extends EventEmitter {
  constructor(name, parent) {
    super();

    this.commands = [];
    this.options = [];
    this._after = undefined;
    this._aliases = [];
    this._allowUnknownOptions = false;
    this._args = [];
    this._catch = false;
    this._help = undefined;
    this._hidden = false;
    this._init = undefined;
    this._mode = false;
    this._name = name;
    this._parent = parent;
    this._relay = false;
    this._types = {};
  }

  /**
   * Registers an option for given command.
   */
  option(flags, description, options = {}) {
    const option = new Option(flags, description, options);
    const name = camelCase(option.name());
    let defaultValue;

    // preassign default value only for --no-*, [optional], or <required>
    if (option.bool === false || option.optional || option.required) {
      // when --no-* we make sure default is true
      if (option.bool === false) {
        defaultValue = true;
      }

      // preassign only if we have a default
      if (typeof defaultValue !== 'undefined') {
        this[name] = defaultValue;
      }
    }

    // register the option
    this.options.push(option);

    // when it's passed, assign the value and conditionally invoke the callback
    this.on(option.name(), (value) => {
      if (typeof this[name] === 'boolean' || typeof this[name] === 'undefined') {
        // if no value, bool true, and we have a default, then use it!
        if (value === null) {
          this[name] = option.bool ? (defaultValue || true) : false;
        } else {
          this[name] = value;
        }
      } else if (value !== null) {
        this[name] = value;
      }
    });

    return this;
  }

  /**
   * Let's you compose other funtions to extend the command.
   */
  use(fn) {
    return fn(this);
  }

  /**
   * Defines an action for a given command.
   */
  action(fn) {
    this._fn = fn;

    return this;
  }

  /**
   * Defines a function to validate arguments
   * before action is performed. Arguments
   * are valid if no errors are thrown from
   * the function.
   */
  validate(fn) {
    this._validate = fn;

    return this;
  }

  /**
   * Defines a function to be called when the
   * command is canceled.
   */
  cancel(fn) {
    this._cancel = fn;

    return this;
  }

  /**
   * Defines a method to be called when
   * the command set has completed.
   */
  done(fn) {
    this._done = fn;

    return this;
  }

  /**
   * Defines tabbed auto-completion
   * for the given command. Favored over
   * deprecated command.autocompletion.
   */
  autocomplete(obj) {
    this._autocomplete = obj;

    return this;
  }

  /**
   * Defines tabbed auto-completion rules
   * for the given command.
   */
  autocompletion(param) {
    this._parent._useDeprecatedAutocompletion = true;

    if (typeof param !== 'function') {
      throw new Error('An invalid object type was passed into the first parameter of Command#autocompletion: function expected.');
    }

    this._autocompletion = param;

    return this;
  }

  /**
   * Defines an init action for a mode command.
   */
  init(fn) {
    if (this._mode !== true) {
      throw Error('Cannot call init from a non-mode action.');
    }

    this._init = fn;

    return this;
  }

  /**
   * Defines a prompt delimiter for a
   * mode once entered.
   */
  delimiter(delimiter) {
    this._delimiter = delimiter;

    return this;
  }

  /**
   * Sets args for static typing of options
   * using minimist.
   */
  types(types) {
    const supported = ['string', 'boolean'];

    Object.keys(types).forEach((item) => {
      if (!supported.includes(item)) {
        throw new Error(`An invalid type was passed into Command#types(): ${item}`);
      }

      this._types[item] = Array.isArray(types[item]) ? types[item] : [types[item]];
    });

    return this;
  }

  /**
   * Defines an alias for a given command.
   */
  alias(...aliases) {
    aliases.forEach((alias) => {
      if (Array.isArray(alias)) {
        this.alias(...alias);

        return;
      }

      this._parent.commands.forEach((command) => {
        if (command._aliases.includes(alias)) {
          throw new Error(
            `Duplicate alias "${alias}" for command "${this._name}" detected. ` +
            `Was first reserved by command "${command._name}".`
          );
        }
      });

      this._aliases.push(alias);
    });

    return this;
  }

  /**
   * Defines description for given command.
   */
  description(desc) {
    if (!desc) {
      return this._description;
    }

    this._description = desc;

    return this;
  }

  /**
   * Removes self from Vorpal instance.
   */
  remove() {
    this._parent.commands = this._parent.commands.filter(command => (
      command._name !== this._name
    ));

    return this;
  }

  /**
   * Returns the commands arguments as string.
   */
  arguments(desc) {
    return this._parseExpectedArgs(desc.split(/ +/));
  }

  /**
   * Returns the help info for given command.
   */
  helpInformation() {
    let desc = [];
    let alias = '';

    if (this._description) {
      desc = [
        `  ${this._description}`,
        '',
      ];
    }

    if (this._aliases.length) {
      alias = `  Alias: ${this._aliases.join(' | ')}\n`;
    }

    const usage = [
      '',
      `  Usage: ${this._name} ${this.usage()}`,
      '',
    ];

    // TODO
    const cmds = [];

    const help = String(this.optionHelp().replace(/^/gm, '    '));
    const options = [
      '  Options:',
      '',
      help,
      '',
    ];

    return usage
      .concat(cmds)
      .concat(alias)
      .concat(desc)
      .concat(options)
      .join('\n')
      .replace(/\n\n\n/g, '\n\n');
  }

  /**
   * Doesn't show command in the help menu.
   */
  hidden() {
    this._hidden = true;

    return this;
  }

  /**
   * Allows undeclared options to be passed in with the command.
   */
  allowUnknownOptions(allow = true) {
    this._allowUnknownOptions = allow;

    return this;
  }

  /**
   * Returns the command usage string for help.
   */
  usage(usage) {
    if (!usage) {
      const args = this._args.map(arg => humanReadableArgName(arg));

      return this._usage || [
        '[options]',
        this.commands.length ? '[command]' : '',
        this._args.length ? args.join(' ') : '',
      ].join(' ');
    }

    this._usage = usage;

    return this;
  }

  /**
   * Returns the help string for the command's options.
   */
  optionHelp() {
    const width = this._largestOptionLength();

    // Prepend the help information
    return [`${pad('--help', width)}  output usage information`]
      .concat(this.options.map(option => (
        `${pad(option.flags, width)} ${option.description}`
      )))
      .join('\n');
  }

  /**
   * Returns the length of the longest option.
   */
  _largestOptionLength() {
    return this.options.reduce((max, option) => Math.max(max, option.flags.length), 0);
  }

  /**
   * Adds a custom handling for the --help flag.
   */
  help(fn) {
    if (typeof fn === 'function') {
      this._help = fn;
    } else {
      throw new Error('A function is required for Command#help.');
    }

    return this;
  }

  /**
   * Edits the raw command string before it is executed.
   */
  parse(fn) {
    if (typeof fn === 'function') {
      this._parse = fn;
    } else {
      throw new Error('A function is required for Command#parse.');
    }

    return this;
  }

  /**
   * Adds a command to be executed after command completion.
   */
  after(fn) {
    if (typeof fn === 'function') {
      this._after = fn;
    } else {
      throw new Error('A function is required for Command#after.');
    }

    return this;
  }

  /**
   * Parses and returns expected command arguments.
   */
  _parseExpectedArgs(args) {
    if (!args || !args.length) {
      return;
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
      this._args = this._args.sort((argu1, argu2) => {
        if (argu1.required && !argu2.required) {
          return -1;
        } else if (argu2.required && !argu1.required) {
          return 1;
        } else if (argu1.variadic && !argu2.variadic) {
          return 1;
        } else if (argu2.variadic && !argu1.variadic) {
          return -1;
        }

        return 0;
      });
    }
  }
}
