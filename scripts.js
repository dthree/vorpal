'use strict';

var speed = 80;
var delimiter = '<span class=\'blue\'>vorpal~$ </span>';
var br = '<br>';

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
    ['send', br + delimiter],
    ['sleep', 500],
    ['send', '<br>' + delimiter],
    ['sleep', 500],
    ['type', 'help', speed],
    ['sleep', 500],
    ['send', '<br><br>&nbsp;&nbsp;Commands:<br><br>&nbsp;&nbsp;&nbsp;&nbsp;help [command]&nbsp;&nbsp;&nbsp;Provides help for a given command.<br>&nbsp;&nbsp;&nbsp;&nbsp;exit [options]&nbsp;&nbsp;&nbsp;Exits instance of Vorpal.<br>'],
    ['send', '<br>' + delimiter],
    ['sleep', 1200],
    ['type', 'exit', speed],
    ['sleep', 200],
    ['send', '<br>$ </span>'],
    ['sleep', 500],
  ],
  'feature2': [
    ['send', delimiter],
    ['sleep', 400],
    ['type', 'say I just built a CLI.', speed],
    ['sleep', 200],
    ['send', '<br>I just built a CLI.'],
    ['send', '<br>' + delimiter],
    ['sleep', 1000],
    ['type', 'say taco cat -', speed],
    ['sleep', 200],
    ['type', '-', speed],
    ['sleep', 200],
    ['send', '<br>--backwards  --twice<br>' + delimiter + 'say taco cat --'],
    ['sleep', 1000],
    ['type', 'b', speed],
    ['sleep', 400],
    ['send', 'ackwards'],
    ['sleep', 400],
    ['send', '<br>tac ocat'],
    ['send', '<br>' + delimiter],
  ],
  'feature3': [
    ['send', delimiter],
    ['sleep', 400],
    ['type', 'say taco cat | reverse | color yellow', speed],
    ['sleep', 200],
    ['send', '<br><span class=\'yellow\'>tac ocat</span>'],
    ['send', '<br>' + delimiter],
    ['sleep', 1000]
  ],
  'feature4': [
    ['send', delimiter],
    ['sleep', 400],
    ['type', 'order pizza ', speed],
    ['sleep', 800],
    ['type', '--no-anchovies', speed],
    ['sleep', 200],
    ['send', '<br><span class=\'blue\'>? </span> When would you like your pizza? '],
    ['sleep', 1100],
    ['type', '7:30pm', speed],
    ['sleep', 200],
    ['send', '<br>Okay, 7:30pm it is!', speed],
    ['send', '<br>' + delimiter],
    ['sleep', 1000],
  ],
}

var config = {
  cancel: false,
  wait: 0,
}

function execScript(script) {
  var copy = JSON.parse(JSON.stringify(script));
  config.cancel = true;
  $('.term-code .code').html('');
  setTimeout(function () {
    $('.term-code .code').html('');
    config.cancel = false;
    handleScript(copy);
  }, config.wait + 10);
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
    $('.term-code .code').html($('.term-code .code').html().replace('█', ''));
    $('.term-code .code').append(param).append('█');
    //$('.term-code .code').append(param);
    done();
  } else if (action === 'sleep') {
    config.wait = param;
    setTimeout(function() {
      config.wait = 0;
      done();
    }, param);
  }

}

function renderType(str, time, cb) {
  var remainder = str.split('');
  function go() {
    var deviation = time * (1 - Math.random() / 2);
    config.wait = deviation;
    setTimeout(function () {
      config.wait = 0;
      var out = remainder.splice(0, 1);
      if (config.cancel === true) {
        return;
      }
      $('.term-code .code').html($('.term-code .code').html().replace('█', ''));
      $('.term-code .code').append('' + out).append('█');
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
