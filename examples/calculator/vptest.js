var vorpal = require('./../../lib/vorpal')();

vorpal.command('test').action(function (args, cbk) {
  function keyhandle() {
    vorpal.removeListener('keypress', keyhandle);
    vorpal.ui.submit('');
  }
  const cb = function () {
    cbk();
  };
  this.prompt({
    type: 'input',
    name: 'continue',
    message: Math.floor(Math.random() * 1000) + ':'
  }, cb);

  vorpal.on('keypress', keyhandle);
});

vorpal.command('a').action(function (args, cbk) {
  const self = this;
  const cb = function () {
    self.log('Back from prompt!!!');
    cbk();
  };
  this.prompt({
    type: 'input',
    name: 'continue',
    message: 'soo...$'
  }, cb);

  setTimeout(function () {
    vorpal.ui.submit('');
  }, 2000);
});

vorpal.show();
