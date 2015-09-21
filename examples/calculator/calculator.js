'use strict';

/*
var rl = require('readline');
 
var i = rl.createInterface({
  input: process.stdin,
  output: process.stdout, 
  terminal: true 
});

i.question("What do you think of node.js?", function(answer) {
  console.log("Thank you for your valuable feedback.");
  i.close();
  process.stdin.destroy();
});

process.stdin.on('keypress', function(key, data){
  console.log(data);
});

  return;
*/

/**
 * Module dependencies.
 */

var Vorpal = require('./../../lib/vorpal');

/**
 * Variable declarations.
 */

var vorpal = new Vorpal();

vorpal.command('say <words>', 'say something')
  .action(function (args, cb) {
    this.log(args.words);
    cb();
  });

vorpal.command('reverse [words]', 'append bar to stdin')
  .alias('r')
  .action(function (args, cb) {
    let stdin = args.stdin || args.words;
    stdin = String(stdin).split('').reverse().join('');
    this.log(stdin);
    cb();
  });

vorpal.command('array [string]', 'convert string to an array.')
  .action(function (args, cb) {
    let stdin = args.stdin || args.string;
    stdin = String(stdin).split('');
    this.log(stdin);
    cb();
  });

vorpal.command('do [text...]', 'Recite')
  .alias('addition')
  .alias('plus')
  .autocompletion(function(text, iteration, cb) {
    cb(void 0, 'do ' + text + ' re');
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
    var self = this;
    this.log(sum);
    cb(undefined, sum);
  });

vorpal.command('double [values...]', 'Doubles a value on each tab press')
  .autocompletion(function(text, iteration, cb) {
    if (iteration > 1000000) {
      cb(void 0, ['cows', 'hogs', 'horses']);  
    } else {
      var number = String(text).trim();
      if (!isNaN(number)) {
        number = (number < 1) ? 1 : number;
        cb(void 0, 'double ' + number * 2);
      } else {
        cb(void 0, 'double 2');
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
    .init(function(args, cb){
      this.log('Entering REPL Mode.');
      cb();
    })
    .action(function(command, cb){
      console.log(command)
      var res = eval(command);
      this.log(res);
      cb(res);
    });


vorpal
  .delimiter('calc:')
  .show()
  .parse(process.argv);


/*

Ignore - steps to reproduce a bug in Node IP handling.

*/

