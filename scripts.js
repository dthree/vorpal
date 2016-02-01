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
  'feature5': [
    ['send', delimiter],
    ['type', '', speed],
    ['sleep', 800],
    ['send', br + 'exit&nbsp;&nbsp;help&nbsp;&nbsp;order'],
    ['send', br + delimiter],
    ['sleep', 1000],
    ['type', 'order ', speed],
    ['sleep', 400],
    ['send', br + 'burgers&nbsp;&nbsp;chinese&nbsp;&nbsp;pizza&nbsp;&nbsp;sushi'],
    ['send', br + delimiter + 'order '],
    ['sleep', 1000],
    ['type', 's', speed],
    ['sleep', 800],
    ['send', 'ushi '],
    ['sleep', 800],
    ['type', '-', speed],
    ['sleep', 800],
    ['send', '-method '],
    ['sleep', 400],
    ['send', br + 'a la carte&nbsp;&nbsp;table d\'hote'],
    ['send', br + delimiter + 'order sushi --method '],
    ['sleep', 1000],
    ['type', 'a', speed],
    ['sleep', 800],
    ['send', 'la carte'],
    ['sleep', 200],
    ['send', br + 'You ordered sushi a la carte.'],
    ['send', br + delimiter],
    ['sleep', 800],
  ],
  'feature6': [
    ['send', '$ '],
    ['sleep', 400],
    ['type', 'node magical-app.js ', speed],
    ['sleep', 400],
    ['type', 'who', speed],
    ['sleep', 200],
    ['send', '<br>Logged into unicorn-land:<br>Sindre Sorhus<br>Addy Osmani'],
    ['send', '<br><span class=\'magenta\'>unicorn-land~$</span> '],
    ['sleep', 1400],
    ['type', 'help', speed],
    ['sleep', 200],
    ['send', '<br>Welcome to <span class=\'magenta\'>unicorn-land\'s</span> custom help!<br>There are no set commands in unicorn land,<br>so enter anything!'],
    ['send', '<br><span class=\'magenta\'>unicorn-land~$</span> '],
    ['sleep', 1600],
    ['send', 'help'],
    ['sleep', 1000],
    ['slice', 4],
    ['send', 'who'],
    ['sleep', 500],
    ['slice', 3],
    ['send', 'do epic battle against evil'],
    ['sleep', 400],
    ['slice', 27],
    ['send', 'enchant a village'],
    ['sleep', 300],
    ['slice', 17],
    ['send', 'approve of a github repo'],
    ['sleep', 300],
    ['slice', 24],
    ['send', 'switch to narwhal-land'],
    ['sleep', 1000],
    ['slice', 10000],
    ['send', '<span class=\'cyan\'>narwhal-land~$</span> '],
    ['sleep', 1000],
    ['send', '<br><span class=\'cyan\'>narwhal-land~$</span> '],
    ['sleep', 200],
    ['send', '<br><span class=\'cyan\'>narwhal-land~$</span> '],
    ['sleep', 200],
    ['type', 'help', speed],
    ['sleep', 200],
    ['send', '<br>There is only one command in <span class=\'cyan\'>narwhale-land</span>.<br>Actually, it\'s a question:<br><br>when does the narwhale bacon?'],
    ['send', '<br><span class=\'cyan\'>narwhal-land~$</span> '],
    ['sleep', 2000],
    ['type', 'when', speed],
    ['sleep', 400],
    ['send', ' does the narwhal bacon?'],
    ['sleep', 400],
    ['send', '<br>Midnight, of course.'],
    ['send', '<br><span class=\'cyan\'>narwhal-land~$</span> '],
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
    done();
  } else if (action === 'slice') {
    var html = $('.term-code .code').html();
    $('.term-code .code').html(html.slice(0, html.length - (param + 1)));
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
