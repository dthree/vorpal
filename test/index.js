var vorpal = require('../');
var should = require('should');

require('assert');

describe('vorpal', function () {
  describe('constructor', function () {
    it('should exist and be a function', function () {
      should.exist(vorpal);
      vorpal.should.be.type('function');
    });
  });
});
