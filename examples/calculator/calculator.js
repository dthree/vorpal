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


vorpal.command('foo <word>')
  .parse(function (str) {
    let res = `${str} | less -F`;
    if (String(str).indexOf('--no-less') > -1) {
      res = str;
    }
    return res;
  })
  .option('-l, --lucky', 'Have Wat pick the best result for you.')
  .option('--less', 'Pipe into less. Defaults to true.')
  .action(function(args, cb){

    console.log(args);
    cb();
  })
  


vorpal.command('args [items...]', 'Shows args.')
  .option('-d')
  .option('-a')
  .option('--save')
  .action(function (args, cb) {
    this.log(args);
    cb();
  });

vorpal
  .delimiter('calc:')
  .show()
  .parse(process.argv);

