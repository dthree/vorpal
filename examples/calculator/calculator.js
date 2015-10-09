// Please ignore this file, it's currently a playground...

'use strict';

/**
 * Module dependencies.
 */

var Vorpal = require('./../../lib/vorpal');
var _ = require('lodash');
var chalk = require('chalk');

/**
 * Variable declarations.
 */

var vorpal = new Vorpal();
var less = require('vorpal-less');
var repl = require('vorpal-repl');

vorpal.use(less).use(repl);

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


function compare(a, b) {
  for (let item in a) {
    if (a.hasOwnProperty[item]) {
      if (a[item] !== b[item]) {
        console.log('----------')
        console.log(item);
        console.log(a[item])
        console.log(b[item])
      }
      if (_.isObject(a[item])) {
        compare(a[item], b[item]);
      }
    }
  }
}


//\var escapes = require('ansi-escapes')

vorpal.command('gg', '')
  .action(function (args, cb) {
    setTimeout(function(){
      //console.log(vorpal.ui._activePrompt.screen.rl._getDisplayPos())
      //console.log(vorpal.ui._activePrompt.screen.rl._getCursorPos())
      //console.log(vorpal.ui._activePrompt.screen.rl._getDisplayPos())
      //console.log(vorpal.ui._activePrompt.screen.rl._getCursorPos())
    }, 500)
      vorpal.ui.rewrite('cows');
      //vorpal.ui.print();
      //vorpal.ui._activePrompt.screen.rl.cursor = 0;
      //vorpal.ui._activePrompt.screen.rl.cursorTo(process.stdin, 0, 0);
      vorpal.ui.write('foo:');

      //escapes.show
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

vorpal.command('goat1 [andsome...] <required> [optional]').action(function(args, cb) { cb(); console.log(args); });
vorpal.command('goat2 [optional] [andsome...] <required>').action(function(args, cb) { cb(); console.log(args); });

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
  .option('-a, --append <text>')
  .alias('r')
  .action(function (args, cb) {
    var stdin = args.stdin || args.words;
    stdin = String(stdin).split('').reverse().join('');
    stdin += (args.options.append) ? args.options.append : '';
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

vorpal.command('grungy <commands...>', 'Recite')
  .autocompletion(function (text, iteration, cb) {
    vorpal.log('|', text, iteration);
    cb(undefined, [chalk.yellow('fooandsomething'), chalk.red('fizzle'), chalk.green('bumcrumandsome')]);
  })
  .action(function (args, cb) {
    console.log('HI');
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
  .catch('[commands...]')
  .option('-d, --detail')
  .autocompletion(function (text, iteration, cb) {
    vorpal.log('|||', text, iteration);
    cb(undefined, [chalk.yellow('fooandsomething'), chalk.red('fizzle'), chalk.green('bumcrumandsome'), chalk.yellow('fooandsomething'), chalk.red('fizzle'), chalk.green('bumcrumandsome'), chalk.yellow('fooandsomething'), chalk.red('fizzle'), chalk.green('bumcrumandsome')]);
  })
  .action(function (args, cb) {

    console.log(args);

    args.commands = args.commands || [];
    this.log('You said ' + args.commands.join(' '));
    cb();
  });

vorpal
  .delimiter('calc:')
  .show()
  .parse(process.argv);

/*
console.log('WTF\n\n\n');
setTimeout(function () {
  console.log('hi')
}, 4000);
*/

