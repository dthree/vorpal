'use strict';

var Vorpal = require('../');
var commands = require('./util/server');
var BlueBirdPromise = require('bluebird');
var fs = require('fs');

var intercept = require('../dist/intercept');
var stdout = '';
var umute;
var mute = function () {
  unmute = intercept(function (str) {
    stdout += str;
    return '';
  });
}

require('assert');
require('should');

var vorpal = new Vorpal();
var _all = '';
var _stdout = '';
var _excess = '';

var onStdout = function (str) {
  _stdout += str;
  _all += str;
  return '';
};

var stdout = function () {
  var out = _stdout;
  _stdout = '';
  return String(out || '');
};

describe('integration tests:', function () {
  describe('vorpal', function () {
    it('should overwrite duplicate commands', function (done) {
      var arr = ['a', 'b', 'c'];
      arr.forEach(function (item) {
        vorpal
          .command('overwritten', 'This command gets overwritten.')
          .action(function (args, cb) {
            cb(undefined, item);
          });
        vorpal
          .command('overwrite me')
          .action(function (args, cb) {
            cb(undefined, item);
          });
      });

      vorpal.exec('overwritten', function (err, data) {
        (err === undefined).should.be.true;
        data.should.equal('c');
        vorpal.exec('overwrite me', function (err, data) {
          (err === undefined).should.be.true;
          data.should.equal('c');
          done();
        });
      });
    });

    it('should register and execute aliases', function (done) {
      vorpal
        .command('i go by other names', 'This command has many aliases.')
        .alias('donald trump')
        .alias('sinterclaus', ['linus torvalds', 'nan nan nan nan nan nan nan watman!'])
        .action(function (args, cb) {
          cb(undefined, 'You have found me.');
        });

      var ctr = 0;
      var arr = ['donald trump', 'sinterclaus', 'linus torvalds', 'nan nan nan nan nan nan nan watman!'];
      function go() {
        if (arr[ctr]) {
          vorpal.exec(arr[ctr], function (err, data) {
            (err === undefined).should.be.true;
            data.should.equal('You have found me.');
            ctr++;
            if (!arr[ctr]) {
              done();
            } else {
              go();
            }
          });
        }
      }
      go();
    });

    it('should fail on duplicate alias', function (done) {
      (function () {
        vorpal
          .command('This command should crash!', 'Any moment now...')
          .alias('Oh no!')
          .alias('Here it comes!')
          .alias('Oh no!');
      }).should.throw(Error);
      done();
    });

    it('should validate arguments', function (done) {
      var errorThrown = new Error('Invalid Argument');
      vorpal
        .command('validate-me [arg]', 'This command only allows argument "valid"')
        .validate(function (args) {
          this.checkInstance = 'this is the instance';
          if (!args || args.arg !== 'valid') {
            throw errorThrown;
          }
        })
        .action(function (args, cb) {
          this.checkInstance.should.equal('this is the instance');
          cb();
        });

      vorpal.exec('validate-me valid', function (err) {
        (err === undefined).should.be.true;
        vorpal.exec('validate-me invalid', function (err) {
          err.should.equal(errorThrown);
          done();
        });
      });
    });
  });

  describe('vorpal execution', function () {
    before('preparation', function () {
      vorpal.pipe(onStdout).use(commands);
    });

    afterEach(function () {
      _excess += stdout();
    });

    var exec = function (cmd, done, cb) {
      vorpal.exec(cmd).then(function (data) {
        cb(undefined, data);
      }).catch(function (err) {
        console.log(err);
        done(err);
      });
    };

    describe('promise execution', function () {
      it('should not fail', function (done) {
        vorpal.exec('fail me not').then(function () {
          true.should.be.true; done();
        }).catch(function (err) {
          console.log(stdout());
          console.log('b', err.stack);
          true.should.not.be.true; done(err);
        });
      });

      it('should fail', function (done) {
        vorpal.exec('fail me yes').then(function () {
          true.should.not.be.true; done();
        }).catch(function () {
          true.should.be.true; done();
        });
      });
    });

    describe('command execution', function () {
      it('should execute a simple command', function (done) {
        exec('fuzzy', done, function (err) {
          stdout().should.equal('wuzzy');
          done(err);
        });
      });

      it('should execute help', function (done) {
        exec('help', done, function (err) {
          String(stdout()).toLowerCase().should.containEql('help');
          done(err);
        });
      });

      it('should chain two async commands', function (done) {
        vorpal.exec('foo').then(function () {
          stdout().should.equal('bar');
          return vorpal.exec('fuzzy');
        }).then(function () {
          stdout().should.equal('wuzzy');
          done();
        }).catch(function (err) {
          (err === undefined).should.be.true;
          done(err);
        });
      });

      it('should execute a two-word-deep command', function (done) {
        exec('deep command arg', done, function (err) {
          stdout().should.equal('arg');
          done(err);
        });
      });

      it('should execute a three-word-deep command', function (done) {
        exec('very deep command arg', done, function (err) {
          stdout().should.equal('arg');
          done(err);
        });
      });

      // This has ... promise ... problems.
      it.skip('should execute 50 async commands in sync', function (done) {
        this.timeout(4000);
        var dones = 0;
        var result = '';
        var should = '';
        var total = 50;
        var handler = function () {
          dones++;
          if (dones === (total - 1)) {
            result.should.equal(should);
            done();
          }
        };
        var hnFn = function () {
          result += stdout();
          handler();
        };
        var cFn = function (err) {
          done(err);
        };
        for (var i = 1; i < total; ++i) {
          should += i;
          vorpal.exec('count ' + i).then(hnFn).catch(cFn);
        }
      });
    });

    describe('inquirer prompt', function(){
      var parent = Vorpal();

      beforeEach(function(){
        // attach a parent so the prompt will run
         vorpal.ui.attach(parent);
      });

      afterEach(function(){
        vorpal.ui.detach(parent);
      });

      it('should show the default value', function(done){
        var execPromise = vorpal.exec('prompt default myawesomeproject');

        vorpal.ui.inquirerStdout.join('\n').should.containEql('(myawesomeproject)');

        execPromise
          .then(function (s) {
            s.project.should.equal('myawesomeproject');
            // stdout should have cleared once the prompt is finished
            vorpal.ui.inquirerStdout.join('\n').should.not.containEql('(myawesomeproject)');
            done();
          })
          .catch(function (err) {
            console.log(stdout());
            console.log('b', err.stack);
            true.should.not.be.true;
            done(err);
          });

        // submit the default
        vorpal.ui.submit();
      });
    });

    describe('synchronous execution', function () {
      it('should execute a sync command', function () {
        var result = vorpal.execSync('sync');
        result.should.equal('no args were passed');
      });

      it('should execute a sync command with args', function () {
        var result = vorpal.execSync('sync foobar');
        result.should.equal('you said foobar');
      });

      it('should fail silently', function () {
        var result = vorpal.execSync('sync throwme');
        result.message.should.equal('You said so...');
      });

      it('should fail loudly if you tell it to', function () {
        (function () {
          vorpal.execSync('sync throwme', {fatal: true});
        }).should.throw();
      });
    });

    describe('.command.help', function () {
      it('should execute a custom help command.', function (done) {
        exec('custom-help --help', done, function (err) {
          String(stdout()).should.containEql('This is a custom help output.');
          done(err);
        });
      });
    });

    describe('.command.parse', function () {
      it('should add on details to an existing command.', function (done) {
        exec('parse me in-reverse', done, function (err) {
          String(stdout()).should.containEql('esrever-ni');
          done(err);
        });
      });
    });

    describe('piped commands', function () {
      it('should execute a piped command', function (done) {
        exec('say cheese | reverse', done, function () {
          stdout().should.equal('eseehc');
          done();
        });
      });

      it('should execute a piped command with double quoted pipe character', function (done) {
        exec('say "cheese|meat" | reverse', done, function () {
          stdout().should.equal('taem|eseehc');
          done();
        });
      });

      it('should execute a piped command with single quoted pipe character', function (done) {
        exec('say \'cheese|meat\' | reverse', done, function () {
          stdout().should.equal('taem|eseehc');
          done();
        });
      });

      it('should execute a piped command with angle quoted pipe character', function (done) {
        exec('say `cheese|meat` | reverse', done, function () {
          stdout().should.equal('taem|eseehc');
          done();
        });
      });

      it('should execute multiple piped commands', function (done) {
        exec('say donut | reverse | reverse | array', done, function () {
          stdout().should.equal('d,o,n,u,t');
          done();
        });
      });
    });

    describe('command parsing and validation', function () {
      it('should parse double quoted command option', function (done) {
        exec('say "Vorpal\'s command parsing is great"', done, function () {
          stdout().should.equal('Vorpal\'s command parsing is great');
          done();
        });
      });

      it('should parse single quoted command option', function (done) {
        exec('say \'My name is "Vorpal"\', done', done, function () {
          stdout().should.equal('My name is "Vorpal"');
          done();
        });
      });

      it('should parse angle quoted command option', function (done) {
        exec('say `He\'s "Vorpal"`, done', done, function () {
          stdout().should.equal('He\'s "Vorpal"');
          done();
        });
      });

      it('should parse double quotes pipe character in command argument', function (done) {
        exec('say "(vorpal|Vorpal)", done', done, function () {
          stdout().should.equal('(vorpal|Vorpal)');
          done();
        });
      });

      it('should parse single quoted pipe character in command argument', function (done) {
        exec('say \'(vorpal|Vorpal)\', done', done, function () {
          stdout().should.equal('(vorpal|Vorpal)');
          done();
        });
      });

      it('should parse angle quoted pipe character in command argument', function (done) {
        exec('say `(vorpal|Vorpal)`, done', done, function () {
          stdout().should.equal('(vorpal|Vorpal)');
          done();
        });
      });

      it('should execute a command when not passed an optional variable', function (done) {
        exec('optional', done, function () {
          stdout().should.equal('');
          done();
        });
      });

      it('should understand --no-xxx options', function (done) {
        exec('i want --no-cheese', done, function () {
          stdout().should.equal('false');
          done();
        });
      });

      it('should parse hyphenated options', function (done) {
        exec('hyphenated-option --dry-run', done, function () {
          stdout().should.equal('true');
          done();
        });
      });

      it('should use minimist\'s parse through the .types() method', function (done) {
        exec('typehappy --numberify 4 -s 5', done, function (err, data) {
          (err === undefined).should.be.true;
          data.options.numberify.should.equal(4);
          data.options.stringify.should.equal('5');
          done();
        });
      });

      it('should ignore variadic arguments when not warranted', function (done) {
        exec('required something with extra something', done, function (err, data) {
          (err === undefined).should.be.true;
          data.arg.should.equal('something');
          done();
        });
      });

      it('should receive variadic arguments as array', function (done) {
        exec('variadic pepperoni olives pineapple anchovies', done, function (err, data) {
          (err === undefined).should.be.true;
          data.pizza.should.equal('pepperoni');
          data.ingredients[0].should.equal('olives');
          data.ingredients[1].should.equal('pineapple');
          data.ingredients[2].should.equal('anchovies');
          done();
        });
      });

      it('should receive variadic arguments as array when quoted', function (done) {
        exec('variadic "pepperoni" \'olives\' `pineapple` anchovies', done, function (err, data) {
          (err === undefined).should.be.true;
          data.pizza.should.equal('pepperoni');
          data.ingredients[0].should.equal('olives');
          data.ingredients[1].should.equal('pineapple');
          data.ingredients[2].should.equal('anchovies');
          done();
        });
      });

      it('should accept variadic args as the first arg', function (done) {
        exec('variadic-pizza olives pineapple anchovies', done, function (err, data) {
          (err === undefined).should.be.true;
          data.ingredients[0].should.equal('olives');
          data.ingredients[1].should.equal('pineapple');
          data.ingredients[2].should.equal('anchovies');
          done();
        });
      });

      it('should accept a lot of arguments', function (done) {
        exec('cmd that has a ton of arguments', done, function (err, data) {
          (err === undefined).should.be.true;
          data.with.should.equal('that');
          data.one.should.equal('has');
          data.million.should.equal('a');
          data.arguments.should.equal('ton');
          data.in.should.equal('of');
          data.it.should.equal('arguments');
          done();
        });
      });

      it('should show help when not passed a required variable', function (done) {
        exec('required', done, function () {
          (stdout().indexOf('Missing required argument') > -1).should.equal(true);
          done();
        });
      });

      it('should show help when passed an unknown option', function (done) {
        exec('unknown-option --unknown-opt', done, function () {
          (stdout().indexOf('Invalid option') > -1).should.equal(true);
          done();
        });
      });

      it('should should execute a command when passed a required variable', function (done) {
        exec('required foobar', done, function () {
          stdout().should.equal('foobar');
          done();
        });
      });

      it('should show help when passed an invalid command', function (done) {
        exec('gooblediguck', done, function () {
          (stdout().indexOf('Invalid Command. Showing Help:') > -1).should.equal(true);
          done();
        });
      });

      it.skip('should show subcommand help on invalid subcommand', function (done) {
        exec('very complicated', done, function () {
          stdout().should.containEql('very complicated deep *');
          done();
        });
      });
    });

    describe('mode', function () {
      it('should enter REPL mode', function (done) {
        vorpal.exec('repl').then(function () {
          stdout().should.containEql('Entering REPL Mode');
          done();
        }).catch(function (err) {
          done(err);
        });
      });

      it('should execute arbitrary JS', function (done) {
        vorpal.exec('3*9').then(function (data) {
          (parseFloat(data) || '').should.equal(27);
          parseFloat(stdout()).should.equal(27);
          done();
        }).catch(function (err) {
          done(err);
        });
      });

      it('should exit REPL mode properly', function (done) {
        vorpal.exec('exit').then(function () {
          stdout();
          return vorpal.exec('help');
        }).then(function () {
          stdout().should.containEql('exit');
          done();
        }).catch(function (err) {
          done(err);
        });
      });
    });

    describe('history', function () {
      var vorpalHistory;
      var UNIT_TEST_STORAGE_PATH = './.unit_test_cmd_history';
      before(function () {
        vorpalHistory = new Vorpal();
        vorpalHistory.historyStoragePath(UNIT_TEST_STORAGE_PATH);
        vorpalHistory.history('unit_test');
        vorpalHistory.exec('command1');
        vorpalHistory.exec('command2');
      });

      after(function (done) {
        // Clean up history
        vorpalHistory.cmdHistory.clear();

        // Clean up directory created to store history
        fs.rmdir(UNIT_TEST_STORAGE_PATH, function () {
          done();
        });
      });

      it('should be able to get history', function () {
        vorpalHistory.session.getHistory('up').should.equal('command2');
        vorpalHistory.session.getHistory('up').should.equal('command1');
        vorpalHistory.session.getHistory('down').should.equal('command2');
        vorpalHistory.session.getHistory('down').should.equal('');
      });

      it('should keep separate history for mode', function () {
        vorpalHistory.cmdHistory.enterMode();
        vorpalHistory.exec('command3');

        vorpalHistory.session.getHistory('up').should.equal('command3');
        vorpalHistory.session.getHistory('up').should.equal('command3');
        vorpalHistory.session.getHistory('down').should.equal('');

        vorpalHistory.cmdHistory.exitMode();

        vorpalHistory.session.getHistory('up').should.equal('command2');
        vorpalHistory.session.getHistory('up').should.equal('command1');
        vorpalHistory.session.getHistory('down').should.equal('command2');
        vorpalHistory.session.getHistory('down').should.equal('');
      });

      it('should persist history', function () {
        var vorpalHistory2 = new Vorpal();
        vorpalHistory2.historyStoragePath(UNIT_TEST_STORAGE_PATH);
        vorpalHistory2.history('unit_test');
        vorpalHistory2.session.getHistory('up').should.equal('command2');
        vorpalHistory2.session.getHistory('up').should.equal('command1');
        vorpalHistory2.session.getHistory('down').should.equal('command2');
        vorpalHistory2.session.getHistory('down').should.equal('');
      });

      it('should ignore consecutive duplicates', function () {
        vorpalHistory.exec('command2');
        vorpalHistory.session.getHistory('up').should.equal('command2');
        vorpalHistory.session.getHistory('up').should.equal('command1');
        vorpalHistory.session.getHistory('down').should.equal('command2');
        vorpalHistory.session.getHistory('down').should.equal('');
      });

      it('should always return last executed command immediately after', function () {
        vorpalHistory.exec('command1');
        vorpalHistory.exec('command2');
        vorpalHistory.session.getHistory('up').should.equal('command2');
        vorpalHistory.exec('command2');
        vorpalHistory.session.getHistory('up').should.equal('command2');
        vorpalHistory.session.getHistory('up').should.equal('command1');
      });
    });

    describe('cancel', function () {
      var longRunningCommand;
      before(function () {
        longRunningCommand = vorpal
          .command('LongRunning', 'This command keeps running.')
          .action(function () {
            var self = this;
            self._cancelled = false;
            var cancelInt = setInterval(function () {
              if (self._cancelled) {
                // break off
                clearInterval(cancelInt);
              }
            }, 1000);
            var p = new BlueBirdPromise(function () {});
            p.cancellable();
            return p;
          });
      });
      it('should cancel promise', function (done) {
        vorpal.exec('LongRunning')
          .then(function () {
            true.should.not.be.true;
            done();
          }).catch(function (instance) {
            instance._cancelled = true;
            done();
          });
        vorpal.session.cancelCommands();
      });
      it('should call registered cancel function', function (done) {
        longRunningCommand
          .cancel(function () {
            this._cancelled = true;
            done();
          });
        vorpal.exec('LongRunning');
        vorpal.session.cancelCommands();
      });
      it('should be able to call cancel in action', function (done) {
        vorpal
          .command('SelfCancel', 'This command cancels itself.')
          .action(function () {
            this.cancel();
          })
          .cancel(function () {
            true.should.be.true;
            done();
          });

        vorpal.exec('SelfCancel');
      });
      it('should handle event client_command_cancelled', function (done) {
        vorpal.on('client_command_cancelled', function () {
          true.should.be.true;
          done();
        });
        longRunningCommand
          .cancel(function () {
            this._cancelled = true;
          });
        vorpal.exec('LongRunning');
        vorpal.session.cancelCommands();
      });
    });

    describe('events', function () {
      it('should handle event command_registered', function (done) {
        vorpal.on('command_registered', function () {
          true.should.be.true; done();
        }).command('newMethod');
      });
      it('should handle event client_keypress', function (done) {
        vorpal.on('client_keypress', function () {
          vorpal.hide();
          done();
        }).delimiter('').show()
          .ui._activePrompt.onKeypress({key: 'k'});
      });
      it('should handle event client_prompt_submit', function (done) {
        vorpal.on('client_prompt_submit', function (result) {
          result.should.equal('');
          vorpal.hide();
          done();
        }).delimiter('')
          .show()
          .ui.submit('');
      });
      it('should handle event client_command_executed', function (done) {
        vorpal.on('client_command_executed', function () {
          true.should.be.true; done();
        });
        vorpal.exec('help');
      });
      it('should handle event client_command_error', function (done) {
        vorpal.on('client_command_error', function () {
          true.should.be.true; done();
        });
        vorpal.exec('fail me plzz');
      });
      it('should handle piped event client_command_error', function (done) {
        var vorpal2 = new Vorpal();
        vorpal2.on('client_command_error', function () {
          true.should.be.true; done();
        })
        .command('fail')
        .action(function (args, cb) {
          cb('failed');
        });
        vorpal2.exec('help | fail | help');
      });
    });

    describe('local storage', function () {
      it('should error if not initialized', function () {
        (function () {
          vorpal.localStorage.setItem();
        }).should.throw();
        (function () {
          vorpal.localStorage.getItem();
        }).should.throw();
        (function () {
          vorpal.localStorage.removeItem();
        }).should.throw();
      });

      it('should error if not passed a unique id', function () {
        (function () {
          vorpal.localStorage();
        }).should.throw();
      });

      it('should set and get items', function () {
        var a = new Vorpal();
        a.localStorage('foo');
        a.localStorage.setItem('cow', 'lick');
        a.localStorage.getItem('cow').should.equal('lick');
      });
    });
  });
});
