var Vorpal = require('../');
var should = require('should');

var vorpal = new Vorpal();

require('assert');

describe('vorpal', function () {
  describe('constructor', function () {
    it('should exist and be a function', function () {
      should.exist(Vorpal);
      Vorpal.should.be.type('function');
    });
  });

  describe('.parse', function () {
    it('should exist and be a function', function () {
      should.exist(vorpal.parse);
      vorpal.parse.should.be.type('function');
    });

    it('should expose minimist', function () {
      var result = vorpal.parse(['a', 'b', 'foo', 'bar', '-r'], {use: 'minimist'});
      result.r.should.be.true;
      (result._.indexOf('foo') > -1).should.be.true;
      (result._.indexOf('bar') > -1).should.be.true;
      result._.length.should.equal(2);
    });
  });

  describe('mode context', function () {
    it('parent should have the same context in init and action', function (done) {
      var vorpal = Vorpal();
      var initCtx;
      vorpal
        .mode('ooga')
        .init(function (args, cb) {
          initCtx = this.parent;
          cb()
        })
        .action(function (args, cb) {
          this.parent.should.equal(initCtx)
          cb()
          done()
        });
      vorpal.exec('ooga')
        .then(function () {
          vorpal.exec('booga')
        });
    });
  });
});
