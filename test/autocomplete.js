var Vorpal = require('../');
var assert = require('assert');
var _ = require('lodash');
var vorpal = new Vorpal();

describe('session._autocomplete', function () {
  it('should return longest possible match', function () {
    var result = vorpal.session._autocomplete('c', ['cmd', 'cme', 'def']);
    assert.equal(result, 'cm');
  });

  it('should return list of matches when there are no more common characters', function () {
    var result = vorpal.session._autocomplete('c', ['cmd', 'ced']);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'ced');
    assert.equal(result[1], 'cmd');
  });

  it('should return list of matches even if we have a complete match', function () {
    var result = vorpal.session._autocomplete('cmd', ['cmd', 'cmd2']);
    assert.equal(result.length, 2);
    assert.equal(result[0], 'cmd');
    assert.equal(result[1], 'cmd2');
  });

  it('should return undefined if no match', function () {
    var result = vorpal.session._autocomplete('cmd', ['def', 'xyz']);
    assert.equal(result, undefined);
  });

  it('should return the match if only a single possible match exists', function () {
    var result = vorpal.session._autocomplete('d', ['def', 'xyz']);
    assert.equal(result, 'def ');
  });
});

describe('session.getAutocomplete', function () {
  beforeEach(function () {
    vorpal.commands.length = 0;
  });

  after(function () {
    vorpal.ui._activePrompt = undefined;
  });

  it('should return undefined if name matches command with no autocomplete function', function (done) {
    _.set(vorpal.ui, '_activePrompt.screen.rl.cursor', 3);
    vorpal.command('cmd');
    vorpal.session.getAutocomplete('cmd', function (err, res) {
      assert.equal(err, undefined);
      assert.equal(res, undefined);
      done();
    });
  });

  it('should return all matching commands if there are > 1 matches', function (done) {
    _.set(vorpal.ui, '_activePrompt.screen.rl.cursor', 3);
    vorpal.command('cmd')
    .autocompletion(function (text, iteration, cb) {
      cb(undefined, 'helloworld');
    });
    vorpal.command('cmd2');
    vorpal.session.getAutocomplete('cmd', function (err, res) {
      assert.equal(err, undefined);
      assert(_.isArray(res));
      assert.equal(res.length, 2);
      done();
    });
  });

  it('should invoke custom autocompletion if there is only 1 command match', function (done) {
    _.set(vorpal.ui, '_activePrompt.screen.rl.cursor', 3);
    vorpal.command('cmd')
    .autocompletion(function (text, iteration, cb) {
      cb(undefined, 'helloworld');
    });
    vorpal.session.getAutocomplete('cmd', function (err, res) {
      assert.equal(err, undefined);
      assert.equal(res, 'helloworld');
      done();
    });
  });

  it('should invoke custom autocompletion if there is a space after the command name, even ' +
    'if there are other possible command matches', function (done) {
    _.set(vorpal.ui, '_activePrompt.screen.rl.cursor', 3);
    vorpal.command('cmd')
    .autocompletion(function (text, iteration, cb) {
      return cb(undefined, 'helloworld');
    });
    vorpal.command('cmd2');
    vorpal.session.getAutocomplete('cmd ', function (err, res) {
      assert.equal(err, undefined);
      assert.equal(res, 'helloworld');
      done();
    });
  });

  it('should do *something* with piped commands', function (done) {
    _.set(vorpal.ui, '_activePrompt.screen.rl.cursor', 10);
    vorpal.command('cmd')
    .autocompletion(function (text, iteration, cb) {
      return cb(undefined, 'helloworld');
    });
    vorpal.session.getAutocomplete('cmd | less', function (err) {
      assert.equal(err, undefined);
      done();
    });
  });
});
