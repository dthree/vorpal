'use strict';

/**
 * Module dependencies.
 */

var Vorpal = require('./../../lib/vorpal');

/**
 * Variable declarations.
 */

var vorpal = new Vorpal();

vorpal
  .delimiter('calc:')
  .show();

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
      let number = String(text).trim();
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
