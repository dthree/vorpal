 /**
  * This is the new testing file, as
  * the current one totally sucks.
  * eventually move all tests over to
  * this one.
  */

var Vorpal = require('../');
var should = require('should');
var intercept = require('../dist/intercept');

var vorpal;

// Normalize inputs to objects.
function obj(inp) {
  if (typeof inp === 'String') {
    return JSON.stringify(JSON.parse('(' + inp + ')'));
  } else {
    return JSON.stringify(inp);
  }
}

var stdout = '';
var umute;
var mute = function () {
  unmute = intercept(function (str) {
    stdout += str;
    return '';
  });
}

vorpal = Vorpal();
vorpal
  .command('foo [args...]')
  .option('-b, --bool')
  .option('-r, --required <str>')
  .option('-o, --optional [str]')
  .action(function (args, cb) {
    return args;
  });

vorpal
  .command('bar')
  .allowUnknownOptions(true)
  .action(function (args, cb) {
    return args;
  });

vorpal
  .command('baz')
  .allowUnknownOptions(true)
  .allowUnknownOptions(false)
  .action(function (args, cb) {
      return args;
  });

vorpal
  .command('optional [str]')
  .action(function (args, cb) {
    return args;
  });

vorpal
  .command('required <str>')
  .action(function (args, cb) {
    return args;
  });

vorpal
  .command('multiple <req> [opt] [variadic...]')
  .action(function (args, cb) {
    return args;
  });

vorpal
  .command('wrong-sequence [opt] <req> [variadic...]')
  .action(function (args, cb) {
    return args;
  });

vorpal
  .command('multi word command [variadic...]')
  .action(function (args, cb) {
    return args;
  });

require('assert');

describe('argument parsing', function () {
  it('should execute a command with no args', function () {
    var fixture = obj({ options: {} });
    obj(vorpal.execSync('foo')).should.equal(fixture);
  });

  it('should execute a command without an optional arg', function () {
    var fixture = obj({ options: {} });
    obj(vorpal.execSync('optional')).should.equal(fixture);
  });

  it('should execute a command with an optional arg', function () {
    var fixture = obj({ options: {}, str: 'bar' });
    obj(vorpal.execSync('optional bar')).should.equal(fixture);
  });

  it('should execute a command with a required arg', function () {
    var fixture = obj({ options: {}, str: 'bar' });
    obj(vorpal.execSync('required bar')).should.equal(fixture);
  });

  it('should throw help when not passed a required arg', function () {
    mute();
    var fixture = '\n  Missing required argument. Showing Help:';
    vorpal.execSync('required').should.equal(fixture);
    unmute();
  });

  it('should execute a command with multiple arg types', function () {
    var fixture = obj({ options: {}, req: 'foo', opt: 'bar', variadic:  ['joe', 'smith'] });
    obj(vorpal.execSync('multiple foo bar joe smith')).should.equal(fixture);
  });

  it('should correct a command with wrong arg sequences declared', function () {
    var fixture = obj({ options: {}, req: 'foo', opt: 'bar', variadic:  ['joe', 'smith'] });
    obj(vorpal.execSync('multiple foo bar joe smith')).should.equal(fixture);
  });

  it('should normalize key=value pairs', function () {
    var fixture = obj({ options: {},
      req: "a='b'",
      opt: "c='d and e'",
      variadic:  ["wombat='true'","a","fizz='buzz'","hello='goodbye'"] });
    obj(vorpal.execSync('multiple a=\'b\' c="d and e" wombat=true a fizz=\'buzz\' "hello=\'goodbye\'"')).should.equal(fixture);
  });

  it('should NOT normalize key=value pairs when isCommandArgKeyPairNormalized is false', function () {
    var fixture = obj({ options: {},
      req: "hello=world",
      opt: 'hello="world"',
      variadic: ['hello=`world`']
    });
    vorpal.isCommandArgKeyPairNormalized = false;
    obj(vorpal.execSync('multiple "hello=world" \'hello="world"\' "hello=`world`"')).should.equal(fixture);
    vorpal.isCommandArgKeyPairNormalized = true;
  });

  it('should execute multi-word command with arguments', function () {
    var fixture = obj({ options: {}, variadic:  ['and', 'so', 'on'] });
    obj(vorpal.execSync('multi word command and so on')).should.equal(fixture);
  });
});

describe('option parsing', function () {
  it('should execute a command with no options', function () {
    var fixture = obj({ options: {} });
    obj(vorpal.execSync('foo')).should.equal(fixture);
  });

  it('should execute a command with args and no options', function () {
    var fixture = obj({ options: {}, args: ['bar', 'smith'] });
    obj(vorpal.execSync('foo bar smith')).should.equal(fixture);
  });

  describe('options before an arg', function () {
    it('should accept a short boolean option', function () {
      var fixture = obj({ options: { bool: true }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo -b bar smith')).should.equal(fixture);
    });

    it('should accept a long boolean option', function () {
      var fixture = obj({ options: { bool: true }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo --bool bar smith')).should.equal(fixture);
    });

    it('should accept a short optional option', function () {
      var fixture = obj({ options: { optional: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo --o cheese bar smith')).should.equal(fixture);
    });

    it('should accept a long optional option', function () {
      var fixture = obj({ options: { optional: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo --optional cheese bar smith')).should.equal(fixture);
    });

    it('should accept a short required option', function () {
      var fixture = obj({ options: { required: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo -r cheese bar smith')).should.equal(fixture);
    });

    it('should accept a long required option', function () {
      var fixture = obj({ options: { required: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo --required cheese bar smith')).should.equal(fixture);
    });
  });

  describe('options after args', function () {
    it('should accept a short boolean option', function () {
      var fixture = obj({ options: { bool: true }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo bar smith -b ')).should.equal(fixture);
    });

    it('should accept a long boolean option', function () {
      var fixture = obj({ options: { bool: true }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo bar smith --bool ')).should.equal(fixture);
    });

    it('should accept a short optional option', function () {
      var fixture = obj({ options: { optional: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo bar smith --o cheese ')).should.equal(fixture);
    });

    it('should accept a long optional option', function () {
      var fixture = obj({ options: { optional: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo bar smith --optional cheese ')).should.equal(fixture);
    });

    it('should accept a short required option', function () {
      var fixture = obj({ options: { required: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo bar smith -r cheese ')).should.equal(fixture);
    });

    it('should accept a long required option', function () {
      var fixture = obj({ options: { required: 'cheese' }, args: ['bar', 'smith'] });
      obj(vorpal.execSync('foo bar smith --required cheese ')).should.equal(fixture);
    });
  });

  describe('options without an arg', function () {
    it('should accept a short boolean option', function () {
      var fixture = obj({ options: { bool: true }});
      obj(vorpal.execSync('foo -b ')).should.equal(fixture);
    });

    it('should accept a long boolean option', function () {
      var fixture = obj({ options: { bool: true }});
      obj(vorpal.execSync('foo --bool ')).should.equal(fixture);
    });

    it('should accept a short optional option', function () {
      var fixture = obj({ options: { optional: 'cheese' }});
      obj(vorpal.execSync('foo --o cheese ')).should.equal(fixture);
    });

    it('should accept a long optional option', function () {
      var fixture = obj({ options: { optional: 'cheese' }});
      obj(vorpal.execSync('foo --optional cheese ')).should.equal(fixture);
    });

    it('should accept a short required option', function () {
      var fixture = obj({ options: { required: 'cheese' }});
      obj(vorpal.execSync('foo -r cheese ')).should.equal(fixture);
    });

    it('should accept a long required option', function () {
      var fixture = obj({ options: { required: 'cheese' }});
      obj(vorpal.execSync('foo --required cheese ')).should.equal(fixture);
    });
  });

  describe('option validation', function () {
    it('should execute a boolean option without an arg', function () {
      var fixture = obj({ options: { bool: true }});
      obj(vorpal.execSync('foo -b')).should.equal(fixture);
    });

    it('should execute an optional option without an arg', function () {
      var fixture = obj({ options: { optional: true }});
      obj(vorpal.execSync('foo -o')).should.equal(fixture);
    });

    it('should execute an optional option with an arg', function () {
      var fixture = obj({ options: { optional: 'cows' }});
      obj(vorpal.execSync('foo -o cows')).should.equal(fixture);
    });

    it('should execute a required option with an arg', function () {
      var fixture = obj({ options: { required: 'cows' }});
      obj(vorpal.execSync('foo -r cows')).should.equal(fixture);
    });

    it('should throw help on a required option without an arg', function () {
      var fixture = "\n  Missing required value for option --required. Showing Help:";
      mute();
      vorpal.execSync('foo -r').should.equal(fixture);
      unmute();
    });
  });

  describe('negated options', function () {
    it('should make a boolean option false', function () {
      var fixture = obj({ options: { bool: false }, args: ['cows'] });
      obj(vorpal.execSync('foo --no-bool cows')).should.equal(fixture);
    });

    it('should make an unfilled optional option false', function () {
      var fixture = obj({ options: { optional: false }, args: ['cows'] });
      obj(vorpal.execSync('foo --no-optional cows')).should.equal(fixture);
    });

    it('should ignore a filled optional option', function () {
      var fixture = obj({ options: { optional: false }, args: ['cows'] });
      obj(vorpal.execSync('foo --no-optional cows')).should.equal(fixture);
    });

    it('should return help on a required option', function () {
      var fixture = "\n  Missing required value for option --required. Showing Help:";
      mute();
      vorpal.execSync('foo --no-required cows').should.equal(fixture);
      unmute();
    });

    it('should throw help on an unknown option', function() {
      var fixture = "\n  Invalid option: 'unknown'. Showing Help:";
      vorpal.execSync('foo --unknown').should.equal(fixture);
    });

    it('should allow unknown options when allowUnknownOptions is set to true', function() {
      var fixture = obj({ options: { unknown: true }});
      obj(vorpal.execSync('bar --unknown')).should.equal(fixture);
    });

    it('should allow the allowUnknownOptions state to be set with a boolean', function() {
        var fixture = "\n  Invalid option: 'unknown'. Showing Help:";
        vorpal.execSync('baz --unknown').should.equal(fixture);
    });
  });
});


describe('help menu', function () {
  var longFixture = 'Twas brillig and the slithy toves, did gyre and gimble in the wabe. All mimsy were the borogoves. And the mome wraths outgrabe. Beware the Jabberwock, my son. The claws that bite, the jaws that catch. Beware the jubjub bird and shun, the frumious bandersnatch. Twas brillig and the slithy toves, did gyre and gimble in the wabe. All mimsy were the borogoves. And the mome wraths outgrabe. Beware the Jabberwock, my son. The claws that bite, the jaws that catch. Beware the jubjub bird and shun, the frumious bandersnatch. Twas brillig and the slithy toves, did gyre and gimble in the wabe. All mimsy were the borogoves. And the mome wraths outgrabe. Beware the Jabberwock, my son. The claws that bite, the jaws that catch. Beware the jubjub bird and shun, the frumious bandersnatch.';
  var shortFixture = 'Twas brillig and the slithy toves.';
  var help;

  before(function () {
    help = Vorpal();
    help.command('foo [args...]')
      .action(function (args, cb) {
        return args;
      });
  });

  it.skip('show help on an invalid command', function () {
    stdout = '';
    mute();
    var fixture = '\n  Invalid Command. Showing Help:\n\n  Commands:\n\n    help [command...]  Provides help for a given command.\n    exit               Exits application.\n    foo [args...]      \n\n\n';
    help.execSync('cows')
    unmute();
    stdout.should.equal(fixture);
  });
});
