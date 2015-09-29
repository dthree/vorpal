// Please ignore this file, it's currently a playground...

'use strict';

/**
 * Module dependencies.
 */

var Vorpal = require('./../../lib/vorpal');

/**
 * Variable declarations.
 */

var vorpal = new Vorpal();
var less = require('vorpal-less');

vorpal.use(less);

vorpal.command('test').action(function (args, cbk) {
  function keyhandle() {
    console.log('keypress!!!');
    vorpal.removeListener('keypress', keyhandle);
    vorpal.ui.submit('');
  }
  vorpal.on('keypress', keyhandle);
  const self = this;
  const cb = function () {
    self.log('Back from prompt!!!');
    cbk();
  };
  this.prompt({
    type: 'input',
    name: 'continue',
    message: ':'
  }, cb);
});

vorpal
  .command('foor')
  .option('-f, --foo')
  .parse(function (str) {
    return str + ' | reverse';
  })
  .help(function (args, cb) {
    this.log('This command outputs \'bar\'.');
    cb();
  })
  .action(function (args, cb) {
    this.log('bar');
    cb();
  });

vorpal.command('delim <string>', 'change delimiter to something else.')
  .action(function (args, cb) {
    this.delimiter(args.string);
    cb();
  });

vorpal.command('say <words>', 'say something')
  .action(function (args, cb) {
    this.log(args.words);
    cb();
  });

vorpal.command('destroy database').action(function (args, cb) {
  var self = this;
  this.prompt({
    type: 'input',
    name: 'continue',
    default: false,
    message: 'That sounds like a really bad idea. Continue?'
  }, function (result) {
    self.log(result);
    cb();
  });
});

vorpal.command('c', 'say something')
  .action(function (args, cb) {
    setInterval(function () {
      var arr = [];
      for (var i = 0; i < process.stdout.rows - 1; ++i) {
        arr.push(Math.random());
      }
      vorpal.ui.rewrite(arr.join('\n'));
    }, 10);
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

vorpal.command('array [string]', 'convert string to an array.')
  .action(function (args, cb) {
    var stdin = args.stdin || args.string;
    stdin = String(stdin).split('');
    this.log(stdin);
    cb();
  });

vorpal.command('do [text...]', 'Recite')
  .alias('addition')
  .alias('plus')
  .autocompletion(function (text, iteration, cb) {
    cb(undefined, 'do ' + text + ' re');
  })
  .action(function (args, cb) {
    var result = this.match('r', ['red', 'reset']);
    this.log(result);
    cb();
  });

vorpal.command('add [numbers...]', 'Adds numbers together')
  .alias('addition')
  .alias('plus')
  .action(function (args, cb) {
    var numbers = args.numbers;
    var sum = 0;
    for (var i = 0; i < numbers.length; ++i) {
      sum += parseFloat(numbers[i]);
    }
    this.log(sum);
    cb(undefined, sum);
  });

vorpal.command('double [values...]', 'Doubles a value on each tab press')
  .autocompletion(function (text, iteration, cb) {
    if (iteration > 1000000) {
      cb(undefined, ['cows', 'hogs', 'horses']);
    } else {
      var number = String(text).trim();
      if (!isNaN(number)) {
        number = (number < 1) ? 1 : number;
        cb(undefined, 'double ' + number * 2);
      } else {
        cb(undefined, 'double 2');
      }
    }
  })
  .action(function (args, cb) {
    cb();
  });

vorpal.command('args [items...]', 'Shows args.')
  .option('-d')
  .option('-a')
  .option('--save')
  .action(function (args, cb) {
    this.log(args);
    cb();
  });

vorpal
  .mode('repl', 'Enters REPL Mode.')
  .init(function (args, cb) {
    this.log('Entering REPL Mode.');
    cb();
  })
  .action(function (command, cb) {
    console.log(command);
    var res = eval(command);
    this.log(res);
    cb(res);
  });

vorpal
  .delimiter('calc:')
  .show()
  .parse(process.argv);

