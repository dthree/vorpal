var vorpal = require('./../../lib/vorpal')();

vorpal.command('test').action(function(args, cbk) {
  function keyhandle () {
    console.log('keypress!!!');
    vorpal.removeListener('keypress', keyhandle);
    vorpal.ui.submit('');
  };
  vorpal.on('keypress', keyhandle);
  const self = this;
  const cb = function () {
    self.log('Back from prompt!!!');
    cbk();
  };
  this.prompt({
    type: 'input',
    name: 'continue',
    message: ':',
  }, cb);
});


vorpal.show();