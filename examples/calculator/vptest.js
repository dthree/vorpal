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


var cow = {

  obj: function() {
    console.log('Hi');

  },


}


vorpal.show();

/*
setTimeout(function() {
  vorpal.ui.imprint();
  vorpal.log('cheese  pepperoni  olives  anchovies');
}, 2000);

return;
vorpal.ui.delimiter('cows: ');
vorpal.log(vorpal.ui.delimiter());

vorpal.ui.delimiter('NaN: ');
setInterval(function() {
  vorpal.ui.delimiter(vorpal.ui.delimiter() + 'NaN: ');
}, 1000);


return;

setInterval(function() {
  vorpal.ui.input(vorpal.ui.input() + 'NaN');
  vorpal.log(vorpal.ui.input());
}, 1000);

return; 

var ctr = 0;
vorpal.ui.redraw('\n\n\n\n');
vorpal.ui.redraw('\n\n\n\n');
function draw() {
  vorpal.ui.redraw('\n\n' + Math.random() + '\n\n');
  if (ctr < 10) {
    ctr++;
    setTimeout(function (){
      draw();
    }, 200)
  } else {
    vorpal.ui.redraw.clear();
    vorpal.ui.redraw.done();
    ctr = 0;
    setTimeout(function() {
      vorpal.ui.redraw('\n\n\n\n');
      draw();
    }, 500)
  }
}
draw();


return;
setTimeout(function () {

  //vorpal.ui.redraw('');
  //vorpal.ui.redraw.clear();
  //vorpal.ui.redraw('cows');
  vorpal.ui.delimiter('hesheeeeee: ');

  setTimeout(function () {

    //vorpal.ui.redraw.clear();
    //vorpal.ui.redraw.done();
    vorpal.ui.input('wassoosah');

    setTimeout(function () {

      //vorpal.ui.refresh();
      vorpal.ui.delimiter('a: ');

    }, 1000);

  }, 1000);

}, 1000);

*/
