require('assert');
require('should');

module.exports = function (vorpal) {
  vorpal
    .mode('repl', 'Enters REPL Mode.')
    .init(function (args, cb) {
      this.log('Entering REPL Mode.');
      cb();
    })
    .action(function (command, cb) {
      var res = eval(command);
      this.log(res);
      cb(res);
    });

  vorpal
    .command('foo')
    .description('Should return \'bar\'.')
    .action(function () {
      var self = this;
      return new Promise(function (resolve) {
        self.log('bar');
        resolve();
      });
    });

  vorpal.command('say <words>', 'say something')
    .action(function (args, cb) {
      this.log(args.words);
      cb();
    });

  vorpal.command('prompt default <defaultValue>', 'action prompt')
    .action(function(args, cb) {

      return this.prompt([
        {
          type: 'input',
          name: 'project',
          message: 'Project: ',
          default: args.defaultValue
        }
      ]);

    });

  vorpal.command('parse me <words>', 'Takes input and adds a reverse pipe to it.')
    .parse(function (str) {
      return str + ' | reverse';
    })
    .action(function (args, cb) {
      this.log(args.words);
      cb();
    });

  vorpal.command('custom-help', 'Outputs custom help.')
    .help(function (args, cb) {
      this.log('This is a custom help output.');
      cb();
    })
    .action(function (args, cb) {
      cb();
    });

  vorpal.command('reverse [words]', 'append bar to stdin')
    .alias('r')
    .action(function (args, cb) {
      var stdin = args.stdin || args.words;
      stdin = String(stdin).split('').reverse().join('');
      this.log(stdin);
      cb();
    });

  vorpal.command('sync [word]', 'run sync')
    .action(function (args) {
      if (args.word === undefined) {
        return 'no args were passed';
      }
      if (args.word === 'throwme') {
        throw new Error('You said so...');
      }
      return 'you said ' + args.word;
    });

  vorpal.command('array [string]', 'convert string to an array.')
    .action(function (args, cb) {
      var stdin = args.stdin || args.string;
      stdin = String(stdin).split('');
      this.log(stdin);
      cb();
    });

  vorpal
    .command('fuzzy')
    .description('Should return \'wuzzy\'.')
    .action(function () {
      var self = this;
      return new Promise(function (resolve) {
        self.log('wuzzy');
        resolve();
      });
    });

  vorpal
    .command('optional [arg]')
    .description('Should optionally return an arg.')
    .action(function (args) {
      var self = this;
      return new Promise(function (resolve) {
        self.log(args.arg || '');
        resolve();
      });
    });

  vorpal
    .command('variadic [pizza] [ingredients...]')
    .description('Should optionally return an arg.')
    .option('-e, --extra', 'Extra complexity on the place.')
    .action(function (args, cb) {
      cb(undefined, args);
    });

  vorpal
    .command('typehappy')
    .option('-n, --numberify <that>', 'Should be a number')
    .option('-s, --stringify <me>', 'Should be a string')
    .types({
      string: ['s', 'stringify']
    })
    .action(function (args, cb) {
      cb(undefined, args);
    });

  vorpal
    .command('cmd [with] [one] [million] [arguments] [in] [it]')
    .description('Should deal with many args.')
    .option('-e, --extra', 'Extra complexity on the place.')
    .action(function (args, cb) {
      cb(undefined, args);
    });

  vorpal
    .command('variadic-pizza [ingredients...]')
    .description('Should optionally return an arg.')
    .option('-e, --extra', 'Extra complexity on the place.')
    .action(function (args, cb) {
      cb(undefined, args);
    });

  vorpal
    .command('port')
    .description('Returns port.')
    .action(function (args, cb) {
      this.log(this.server._port);
      cb(undefined, this.parent.server._port);
    });

  vorpal
    .command('i want')
    .description('Negative args.')
    .option('-N, --no-cheese', 'No chease please.')
    .action(function (args, cb) {
      this.log(args.options.cheese);
      cb();
    });

   vorpal
    .command('hyphenated-option')
    .description('Negative args.')
    .option('--dry-run', 'Perform dry run only.')
    .action(function (args, cb) {
        this.log(args.options['dry-run']);
        cb();
    });

  vorpal
    .command('required <arg>')
    .description('Must return an arg.')
    .action(function (args, cb) {
      this.log(args.arg);
      cb(undefined, args);
    });

  vorpal
    .command('required-option')
    .description('Must return an arg.')
    .option('--arg <arg>', 'Arg to return.')
    .action(function (args, cb) {
      this.log(args.options.arg);
      cb(undefined, args);
    });

  vorpal
    .command('unknown-option')
    .description('shows help if we pass any unknown option.')
    .action(function (args, cb) {
      this.log('should never see this');
      cb(undefined, args);
    });

  vorpal
    .command('fail me <arg>')
    .description('Must return an arg.')
    .action(function (args) {
      return new Promise(function (resolve, reject) {
        if (args.arg === 'not') {
          resolve('we are happy');
        } else {
          reject('we are not happy.');
        }
      });
    });

  vorpal
    .command('deep command [arg]')
    .description('Tests execution of deep command.')
    .action(function (args) {
      var self = this;
      return new Promise(function (resolve) {
        self.log(args.arg);
        resolve();
      });
    });

  vorpal
    .command('very deep command [arg]')
    .description('Tests execution of three-deep command.')
    .action(function (args) {
      var self = this;
      return new Promise(function (resolve) {
        self.log(args.arg);
        resolve();
      });
    });

  vorpal
    .command('count <number>')
    .description('Tests execution of three-deep command.')
    .action(function (args) {
      var self = this;
      return new Promise(function (resolve) {
        self.log(args.number);
        resolve();
      });
    });

  vorpal
    .command('very complicated deep command [arg]')
    .option('-r', 'Test Option.')
    .option('-a', 'Test Option.')
    .option('-d', 'Test Option.')
    .option('-s, --sleep', 'Test Option.')
    .option('-t', 'Test Option.')
    .option('-i [param]', 'Test Option.')
    .description('Tests execution of three-deep command.')
    .action(function (args) {
      var self = this;
      return new Promise(function (resolve) {
        var str = '';
        str = (args.options.r === true) ? str + 'r' : str;
        str = (args.options.a === true) ? str + 'a' : str;
        str = (args.options.d === true) ? str + 'd' : str;
        str = (args.options.t === true) ? str + 't' : str;
        str = (args.options.i === 'j') ? str + args.options.i : str;
        str = (args.options.sleep === 'well') ? str + args.options.sleep : str;
        str += (args.arg || '');
        self.log(str);
        resolve();
      });
    });
};
