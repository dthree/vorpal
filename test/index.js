var assert = require("assert")
  , should = require('should')
  , vorpal = require('../')
  , util = require('./util/util')
  ;

describe('vorpal', function() {

  describe('constructor', function() {

    it('should exist and be a function', function() {
      should.exist(vorpal);
      vorpal.should.be.type('function');
    });
  
  });

});

