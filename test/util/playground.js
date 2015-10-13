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

vorpal.command('promptme')
  .action(function (args, cb) {

     this.prompt({
       type: 'list',
       name: 'data',
       choices: ['a', 'c', 'd'],
       message: 'test',
     }, function(result){
          console.log(result);
         cb();
     });

    setTimeout(function() {
      //vorpal.ui._activePrompt.rl.emit('\u001b[B');
      //vorpal.ui._activePrompt.rl.emit('\u001b[B');
      //console.log(vorpal.ui._activePrompt.rl.emit('line'));
    }, 1000);

  });

vorpal
  .delimiter('calc:')
  .show()
  .parse(process.argv);

setTimeout(function(){
  vorpal.exec('promptme', function() {
});

}, 1000)
