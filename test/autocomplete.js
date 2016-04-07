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