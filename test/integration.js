'use strict';

var Vorpal = require('../');
var commands = require('./util/server');

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
        .alias('sinterclaus')
        .alias('linus torvalds')
        .alias('nan nan nan nan nan nan nan watman!')
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

      it('should execute a long command with arguments', function (done) {
        exec('very complicated deep command abc123 -rad -sleep \'well\' -t -i \'j\' ', done, function () {
          stdout().should.equal('radtjabc123');
          done();
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

      it('should execute multiple piped commands', function (done) {
        exec('say donut | reverse | reverse | array', done, function () {
          stdout().should.equal('d,o,n,u,t');
          done();
        });
      });
    });

    describe('command validation', function () {
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

      it('should show subcommand help on invalid subcommand', function (done) {
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
  });
});
