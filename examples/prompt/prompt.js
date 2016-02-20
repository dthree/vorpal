'use strict';

var vorpal = require('./../../')();

vorpal.command('login', 'Login (u: root p: vorpal)')
  .action(function (args, cb) {
    var self = this;

    var promise = this.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username: '
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password: '
      }
    ], function (answers) {
      // You can use callbacks...
    });

    promise.then(function(answers) {
      // Or promises!
      if (answers.username === 'root' && answers.password === 'vorpal') {
        self.log('Successful login.');
      } else {
        self.log('Login failed! Try username "root" and password "vorpal"!');
      }
      cb();
    });
  });

vorpal
  .show()
  .parse(process.argv);
