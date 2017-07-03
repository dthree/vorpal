'use strict';

var vorpal = require('./../../')();
var chalk = vorpal.chalk;

vorpal
  .title(chalk.magenta('Vorpal'))
  .version('1.4.0')
  .description(chalk.cyan('Conquer the command-line.'))
  .banner(chalk.gray(`              (O)
              <M
   o          <M
  /| ......  /:M\\------------------------------------------------,,,,,,
(O)[ vorpal ]::@+}==========================================------------>
  \\| ^^^^^^  \\:W/------------------------------------------------''''''
   o          <W
              <W
              (O)`));

vorpal.command('build', 'Build the application.')
  .option('-d')
  .option('-a')
  .action(function (args, cb) {
    this.log(args);
    cb();
  });

vorpal.command('clean', 'Clean the local workspace.')
  .option('-f')
  .action(function (args, cb) {
    this.log(args);
    cb();
  });

vorpal.command('compress', 'Compress assets.')
  .option('-gzip')
  .action(function (args, cb) {
    this.log(args);
    cb();
  });

vorpal
  .catch('', 'Displays the index view.')
  .action(function (args, cb) {
    this.log(this.parent._commandHelp(args.command));
    cb();
  });

vorpal
  .delimiter('vorpal:')
  .parse(process.argv);
