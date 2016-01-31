'use strict';

var speed = 80;
var scripts = {
  'feature1': [
    ['send', '$ '],
    ['sleep', 500],
    ['type', 'npm install vorpal', speed],
    ['sleep', 600],
    ['send', '<br>$ '],
    ['sleep', 400],
    ['type', 'echo "require(\'vorpal\')().show();" > cli.js', speed],
    ['sleep', 200],
    ['send', '<br>$ '],
    ['sleep', 800],
    ['type', 'node cli.js', speed],
    ['sleep', 200],
    ['send', '<br><span class=\'blue\'>vorpal~$ </span>'],
    ['sleep', 500],
    ['send', '<br><span class=\'blue\'>vorpal~$ </span>'],
    ['sleep', 500],
    ['type', 'help', speed],
    ['sleep', 500],
    ['send', '<br><br>&nbsp;&nbsp;Commands:<br><br>&nbsp;&nbsp;&nbsp;&nbsp;help [command]&nbsp;&nbsp;&nbsp;Provides help for a given command.<br>&nbsp;&nbsp;&nbsp;&nbsp;exit [options]&nbsp;&nbsp;&nbsp;Exits instance of Vorpal.<br>'],
    ['send', '<br><span class=\'blue\'>vorpal~$ </span>'],
    ['sleep', 1200],
    ['type', 'exit', speed],
    ['sleep', 200],
    ['send', '<br>$ </span>'],
    ['sleep', 500],
  ],
  'feature2': [
    ['send', '<span class=\'blue\'>vorpal~$ </span>'],
    ['sleep', 400],
    ['type', 'say hello how are you?', speed],
    ['sleep', 200],
    ['send', '<br>hello how are you?'],
    ['send', '<br><span class=\'blue\'>vorpal~$ </span>'],
    ['sleep', 1000],
  ],
}

var config = {
  cancel: false
}

function execScript(script) {
  var copy = JSON.parse(JSON.stringify(script));
  config.cancel = true;
  $('.term-code .code').html('');
  setTimeout(function () {
    $('.term-code .code').html('');
    config.cancel = false;
    handleScript(copy);
  }, 100);
}

function handleScript(script) {
  var next = script.shift();
  if (next === undefined) {
    return;
  }
  var action = next[0];
  var param = next[1];
  var time = next[2];

  function done() {
    if (script.length > 0 && config.cancel === false) {
      handleScript(script);
    }
  }

  if (action === 'type') {
    renderType(param, time, function() {
      done();
    });
  } else if (action === 'send') {
    $('.term-code .code').append(param);
    done();
  } else if (action === 'sleep') {
    setTimeout(function() {
      done();
    }, param);
  }

}

function renderType(str, time, cb) {
  var remainder = str.split('');
  function go() {
    var deviation = time * (1 - Math.random() / 2);
    setTimeout(function () {
      var out = remainder.splice(0, 1);
      if (config.cancel === true) {
        return;
      }
      $('.term-code .code').append('' + out);
      if (remainder.length < 1) {
        cb();
        return;
      } else if (config.cancel === false) {
        go();
      }
    }, deviation);
  }
  if (config.cancel === false) {
    go();
  }
}
