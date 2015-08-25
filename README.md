# Vorpal

<img src="https://travis-ci.org/dthree/vorpal.svg" alt="Build Status" />
<a href="https://gitter.im/dthree/vorpal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
  <img src="https://img.shields.io/badge/gitter-join%20chat-brightgreen.svg" alt="Gitter" />
</a>
<a href="https://www.npmjs.com/package/vorpal">
  <img src="https://img.shields.io/npm/v/vorpal.svg" alt="NPM Version" />
</a>
[![Wat: Cheat Sheeted](https://img.shields.io/badge/wat-cheat%20sheeted-blue.svg)](https://github.com/dthree/wat)

```text
              (O)
              <M
   o          <M  
  /| ......  /:M\------------------------------------------------,,,,,,
(O)[ VORPAL ]::@+}==========================================------------>
  \| ^^^^^^  \:W/------------------------------------------------''''''
   o          <W  
              <W
              (O)
```

Vorpal is Node's first framework for building [immersive](#what-is-an-immersive-cli-app) CLI applications. With a simple and powerful API, Vorpal opens the door to a new breed of rich, interactive CLI environments like [wat](https://github.com/dthree/wat) and [vantage](https://github.com/dthree/vantage).

## Contents

* [Introduction](#introduction)
* [Getting Started](#getting-started)
  - [Community](#community)
  - [Quick Start](#quick-start)
* [API](#api)
  - [.command](#commandcommand-description)
  - [.mode](#modecommand-description)
  - [.delimiter](#delimiterstring)
  - [.show](#show)
  - [.find](#find)
* [Events](#events)
* [Automation](#automation)
* [Extensions](#extensions)
* [FAQ](#faq)
* [License](#license)

## Introduction

Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vorpal is a framework for building immersive CLI applications built on an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer). Vorpal launches Node into an isolated CLI environment and provides a suite of API commands and functionality including:

- Commander.js-flavored command creation, including optional, required and variadic commands, arguments and aliases
- Built-in help
- Built-in tabbed auto-completion
- Customizable command-specific auto-completion
- Persistent command history
- Prompts
- Live delimiter control
- Action-based event listeners

Vorpal supports community extensions, which empower it to do such things as [auto-reloading commands](https://github.com/vorpaljs/vorpal-watch), [live command imports](https://github.com/vorpaljs/vorpal-use) or even supporting a [built-in REPL](https://github.com/vorpaljs/vorpal-repl).

## Getting Started

##### Community

- [Q&A? Join Gitter Chat](https://gitter.im/dthree/vorpal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
- [Projects Made with Vorpal](https://github.com/vorpaljs/awesome-vorpaljs)
- [List of Vorpal Extensions](https://github.com/vorpaljs/awesome-vorpaljs#extensions)

##### Quick Start

First, install `vorpal` into your project:

```bash
$ npm install vorpal --save
```

In your project, add in the following:

```js
// Create a new instance of vorpal.
var vorpal = require("vorpal")();

// Add the command "foo", which logs "bar".
vorpal
  .command("foo")
  .description("Outputs 'bar'.")
  .action(function(args, callback) {
    this.log("bar");
    callback();
  });
  
// Name your prompt delimiter 
// "myapp$" and show the Vorpal prompt.
vorpal
  .delimiter("myapp$")
  .show();
```
Run your project file. You Node app has become a CLI.

```bash
$ node server.js
myapp~$ 
```

Try out your "foo" command.

```bash
myapp~$ foo
bar
myapp~$
```

Now type "help" to see Vorpal's built in commands in addition to "foo":

```bash
myapp~$ help

  Commands
  
    help [command]    Provides help for a given command.
    exit [options]    Exits the app.
    foo               Outputs "bar".

myapp~$
```

That's the basic idea. Once you get the hang of it, read on to learn some of the fancier things Vorpal can do.

## API

### .command(command, [description])

Adds a new command to your command line API. Returns a `Command` object, with the following chainable functions:

* [`.description(string)`](#commanddescriptionstring): Used in automated help for your command.
* [`.alias()`](#commandaliasstring): Gives an alias to execute the command with.
* [`.hidden()`](#commandhidden): Removes command from help menus.
* [`.option(string, [description])`](#commandoptionstring-description): Provides command options, as in `-f` or `--force`.
* [`.autocompletion(function(text, iteration, callback))`](#commandautocompletiontextiterationcallback): Command-specific tabbed auto-completion.
* [`.action(function(args, callback))`](#commandactionfunction): Function to execute when command is executed.

```js
vorpal
  .command("foo")
  .description("Outputs 'bar'.")
  .alias('foosball')
  .action(function(args, callback) {
    this.log("bar");
    callback();
  });
```
The syntax is similar to `commander.js` with the exception of allowing nested sub-commands for grouping large APIs into manageable chunks.

```js
// Simple command with no arguments.
vorpal.command("foo", "Description of foo.");

// Optional argument.
vorpal.command("foo [bar]"); 

// Required argument.
vorpal.command("foo <bar>"); 

// Variadic argument.
vorpal.command("foo [bars...]"); 

// Examples of nested subcommands:
vorpal.command("farm animals");
vorpal.command("farm tools");
vorpal.command("farm feed [animal]");
vorpal.command("farm with farmer brown and reflect on <subject>");
```
Descriptions can optionally be passed in as the second parameter, which are used to build the automated help.

##### Sub-commands

When displaying the help menu, sub-commands will be grouped separately:

```bash
myapp~$ help

  Commands: ( ... )
  
  Command Groups:
  
    farm *            4 sub-commands.

```
Entering "farm" or "farm --help" would then drill down on the commands:

```bash
myapp~$ farm

  Commands:
  
    farm animals        Lists all animals in the farm.
    farm tools          Lists all tools in the farm.
    farm feed [animal]  Feeds a given animal.
  
  Command Groups:
  
    farm with *          1 sub-command.
    
```

#### .command.description(string)

If you don't pass a description into `vorpal.command(...)` above, you can use the `description` function as an alternative.

```js
vorpal
  .command("foo")
  .description("outputs bar")
  // ...
```

#### .command.alias(string)

Provides an alias to the command. If the user enters the alias, the original command will be fired.

#### .command.hidden()

Makes the command invisible, though executable. Removes from all automated help menus.

#### .command.remove()

Deletes a given command. Useful for getting rid of unwanted functionality when importing external extensions.

```js
  var help = vorpal.find('help');
  if (help) { 
    help.remove() 
  }
```

#### .command.option(string, [description])

You can provide both short and long versions of an option. Examples:

```js
vorpal
  .command("random", "Does random things.")
  .option('-f, --force', 'Force file overwrite.')
  .option('-a, --amount <coffee>', 'Number of cups of coffee.')
  .option('-v, --verbosity [level]', 'Sets verbosity level.')
  .option('-A', 'Does amazing things.')
  .option('--amazing', 'Does amazing things')
  // ...
```

#### .command.autocompletion(text, iteration, callback)

Registers a custom tabbed autocompletion for this command. 

If a user has typed part of a registered command, the default auto-completion will fill in the rest of the command:

```bash
node~$ co
node~$ cook
```

However, after the user has fully typed the command `cook`, you can now implement command-specific auto-completion:

```bash
node~$ bake coo            # tab is pressed
node~$ bake cookies        # tab is pressed again
cake  cookies  pie
node~$ bake cookies 
```

This is implemented as follows:

```js
vorpal
  .command("bake", "Bakes a meal.")
  .autocompletion(function(text, iteration, cb) {
    
    // The meals are all of the possible actions.
    var meals = ["cookies", "pie", "cake"];
    
    // The iteration is the count of how many times
    // the `tab` key was pressed in a row. You can
    // make multiple presses return all of the options
    // for the user's convenience. 
    if (iteration > 1) {

      // By returning an array of values, Vorpal
      // will format them in a pretty fashion, as
      // in the example above.
      cb(void 0, meals);

    } else {

      // `this.match` is a helper function that will
      // return the closest auto-completion match.
      // Just makin' your job easier.
      var match = this.match(text, meals);
      
      if (match) {

        // If there is a good autocomplete, return
        // it in the callback (first param is reserved
        // for errors).
        cb(void 0, meals);
      } else {

        // If you don't want to do anything, just
        // return undefined.
        cb(void 0, void 0);
      }
    }
  })
  .action(...);
```

#### .command.action(function)

This is the action execution function of a given command. It passes in an `arguments` object and `callback`.

Actions are executed async and must either call the passed `callback` upon completion or return a `Promise`.

```js
// As a callback:
command(...).action(function(args, cb){
  var self = this;
  doSomethingAsync(function(results){
    self.log(results);
    // If this is not called, Vorpal will not 
    // return its CLI prompt after command completion.
    cb();
  });
});

// As a newly created Promise:
command(...).action(function(args, cb){
  return new Promise(function(resolve, reject) {
    if (skiesAlignTonight) {
      resolve();
    } else {
      reject("Better luck next time");
    }
  });
});

// Or as a pre-packaged promise of your app:
command(...).action(function(args, cb){
  return app.promisedAction(args.action);
});
```

##### Action Arguments

Given the following command:

```js
vorpal
  .command('order pizza [type] [otherThings...]', 'Orders a type of food.')
  .option('-s, --size <size>', 'Size of pizza.')
  .option('-a, --anchovies', 'Include anchovies.')
  .option('-p, --pineapple', 'Include pineapple.')
  .option('-o', 'Include olives.')
  .option('-d, --delivery', 'Pizza should be delivered')
  .action(function(args, cb){
    this.log(args);
    cb();
  });
```
Args would be returned as follows:

```bash
$myapp~$ order pizza pepperoni some other args -pod --size "medium" --no-anchovies
{
  "type": "pepperoni",
  "otherThings": ["some", "other", "args"]
  "options": {
    "pineapple": true,
    "o": true,
    "delivery": true,
    "anchovies": false,
    "size": "medium",
  }
}
```

##### Action Context (Session)

The `this` variable in a `command.action` function is exposed to a special "Session" context. This context has a few functions to make use of:

##### session.log(string)

Any and all logging in `command.action` should be done through `this.log`, which behaves exactly like `console.log`. This ensures all output for your given Vorpal session is piped back properly to your TTY, and so that logging does not interrupt what the user is typing in their prompt.

```js
vorpal
  .command("foo", "Outputs 'bar'.")
  .action(function(args, callback) {
    
    // This will pipe back to your terminal.
    this.log("bar");

    // This will only log on the remote terminal,
    // and you will not see it on your local TTY.
    console.log("bar"); 

    callback();
  });
```

##### session.prompt(object, [callback])

Vorpal supports mid-command prompting. You can make full use of [inquirer.js](https://www.npmjs.com/package/inquirer)'s `prompt` function, which is exposed through `this.prompt`.

```js
vorpal.command("destroy database").action(function(args, cb){
  var self = this;
  this.prompt({
    type: "confirm",
    name: "continue",
    default: false,
    message: "That sounds like a really bad idea. Continue?",
  }, function(result){
    if (!result.continue) {
      self.log("Good move.");
      cb();
    } else {
      self.log("Time to dust off that resume.");
      app.destroyDatabase(cb);
    }
  });
});
```

```bash
dbsvr~$ destroy database
? That sounds like a really bad idea. Continue? y/N: N
Good move.
dbsvr~$
```

##### session.delimiter(string)

You can change the prompt delimiter mid command through `this.delimiter`.

```js
vorpal
  .command("delimiter <string>")
  .action(function(args, cb){
    this.delimiter(args.string);
    cb();
  });
```

```bash
websvr~$ delimiter unicornsvr~$
unicornsvr~$
```

### .mode(command, [description])

Mode is a special type of `command` that brings the user into a given `mode`, wherein regular Vorpal commands are ignored and the full command strings are interpreted literally by the `mode.action` function. This will continue until the user exits the mode by typing `exit`.

```js
vorpal
  .mode("repl")
  .description("Enters the user into a REPL session.")
  .delimiter("repl:")
  .action(function(command, callback) {
    this.log(eval(command));
  });
```
```bash
$ node server.js
node~$ 
node~$ repl
node~$ repl: 
node~$ repl: 6 * 7
42
node~$ repl: Math.random();
0.62392647205
node~$ repl: exit
node~$ 
```

`mode`'s syntax is a duplicate of `command`'s, with the following additional / altered commands:

* [`.delimiter(string)`](#modedelimiterstring): Tacks on an additional prompt delimiter for orientation.
* [`.init(function)`](#modeinitfunction): Same as `command`'s `.action`, called once on entering the mode.
* [`.action(function)`](#modeactionfunction): Called on each command submission while in the mode.

#### .mode.delimiter(string)

This will add on an additional delimiter string to one's Vorpal prompt upon entering the mode, so the user can differentiate what state he is in.

```js
vorpal
  .mode('repl')
  .delimiter('you are in repl>')
  .action(function(command, callback) {
    this.log(eval(command));
  });
```

```bash
node~$ 
node~$ repl
node~$ you are in repl>  
```
#### .mode.init(function)

Behaves exactly like `command.action`, where the function passed in is fired once when the user enters the given mode. Passed the same parameters as `command.action`: `args` and `callback`. `init` is helpful when one needs to set up the mode or inform the user of what is happening.

```js
vorpal
  .mode('sql')
  .delimiter('sql:')
  .init(function(args, callback){
    this.log('Welcome to SQL mode.\nYou can now directly enter arbitrary SQL commands. To exit, type `exit`.');
    callback();
  })
  .action(function(command, callback) {
    var self = this;
    app.query(command, function(res){
      self.log(res);
      callback();
    });
  });
```

```bash
node~$
node~$ sql
Welcome to SQL mode.
You can now directly enter arbitrary SQL commands. To exit, type `exit`.
node~$ sql: 
node~$ sql: select first_name, last_name from persons where first_name = 'George';

first_name        last_name
----------------  ----------------
George            Clooney
George            Smith
George            Stevens

node~$ sql: 
node~$ sql: exit
node~$
```

#### .mode.action(function)

Similar to `command.action`, `mode.action` differs in that it is repeatedly called on each command the user types until the mode is exited. Instead of `args` passed as the first argument, the full `command` string the user typed is passed and it is expected that `mode.action` appropriately handles the command. Example given above.

### .delimiter(string)

Sets the prompt delimiter for the given Vorpal instance.

```js
new Vorpal().delimiter('unicorn-approved-app$');
```

```bash
~$ myglobalapp
unicorn-approved-app$ 
unicorn-approved-app$ exit -f
~$ 
```

### .show()

Attaches the TTY's CLI prompt to that given instance of Vorpal. 

```js
// ... (your app's code)

vorpal
  .delimiter('pg-cli:')
  .show();
  
vorpal
  .command('sql <query>', 'Executes arbitrary sql.')
  .action(function(args, cb){
    return app.execSQL(args.query);
  });
```

```bash
$ node pgcli.js
Started interactive Postgres CLI.
pg-cli~$ 
pg-cli~$ sql "select top 1 first_name from persons"
  
  first_name
  -------------
  Joe

pg-cli~$
```
As a note, multiple instances of Vorpal can run in the same Node instance. However, only one can be "attached" to your TTY. The last instance given the `show()` command will be attached, and the previously shown instances will detach.

```js
var instances = []
for (var i = 0; i < 3; ++i) {
  instances[i] = new Vorpal()
    .delimiter("instance" + i + "~$")
    .command("switch <instance>", "Switches prompt to another instance.")
    .action(function(args, cb){
      instances[args.instance].show();
      cb();
    })
}

instances[0].show();
```

```bash
$ node server.js
instance0~$ switch 1
instance1~$ switch 2
instance2~$ switch 0
instance0~$
```

### .find(string)

Returns a given command by its name. This is used instead of `vantage.command()` as `.command` will overwrite a given command. If command is not found, `undefined` is returned.

```js
  var help = vorpal.find('help');
  if (help) { 
    help.hidden() 
  }
```

## Events

Vorpal extends `EventEmitter.prototype`. Simply use `vorpal.on('event', fn)` and `vorpal.emit('event', data)`. The following events are supported:

- `command_registered`: Fires when `vorpal.command` registers a new command.

- `client_keypress`: Fires on keypress on local client terminal.

- `client_prompt_submit`: Fires when the CLI prompt has been submitted with a command, including ''.

- `client_command_executed`: Fires at the client once the command has been received back as executed.

- `client_command_error`: Fires at the client if a command comes back with an error thrown.

## Automation

Vorpal allows you execute your API commands from javascript synchronously, using either callbacks or promises.

### .exec(command, [callback])

Executes an API command string. Returns a callback or Promise.

```js
// Using Promises:
vorpal.exec("get ingredients").then(function(data){
  return vorpal.exec("roll dough");
}).then(function(data){
  return vorpal.exec("add cheese");
}).then(function(data){
  return vorpal.exec("add pepperoni");
}).then(function(data){
  return vorpal.exec("shape crust");
}).then(function(data){
  return vorpal.exec("insert into oven");
}).then(function(data){
  return vorpal.exec("wait 480000");
}).then(function(data){
  return vorpal.exec("remove from oven");
}).then(function(data){
  return vorpal.exec("enjoy");
}).catch(function(err){
  console.log("Error baking pizza: " + err);
  app.orderOut();
});

// Using callbacks:
vorpal.exec("prepare pizza", function(err, data) {
  if (!err) {
    vorpal.exec("bake pizza", function(err, pizza){
      if (!err) {
        app.eat(pizza);
      }
    });
  }
});
```

### .pipe(function)

Captures all session `stdout` piped through Vorpal and passes it through a custom function. The string returned from the function is then logged.

```js
var onStdout = function(stdout) {
  app.writeToLog(stdout);
  return "";
}

vorpal
  .pipe(onStdout);

vorpal.log('Hello');
```

## Extensions

Vorpal supports command extensions and this is the primary reason for supporting sub-commands. For example, someone could create a suite of server diagnostic commands under the namespace `system` and publish it as `vorpal-system`.

##### vorpal.use(extension)

Vorpal has a `.use(extension)` function, which expects a Node module extension (exposed as a function). You can also pass in the string of the module as an alternative, and `vorpal` will `require` it for you.

```js
var system = require('vorpal-system');
vorpal.use(system);

/* 
  Your API would now include a suite of system commands:
  system list processes
  system status
  system ... etc.
*/
```

```js
// Does the same thing as above.
vorpal.use('vorpal-system');
```

### Creating an extension

Creating and publishing a Vorpal extension is simple. Simply expose your module as a function which takes two parameters - `vorpal` and `options`. When your module is imported by `vorpal`, it will pass itself in as the first object, and so you are free to add any commands or configuration that `vorpal` supports.

```js
module.exports = function(vorpal, options) {
  
  vorpal.
    .command("foo", "Outputs 'bar'.")
    .action(function(args, cb){
      this.log("bar");
      cb();
    });

  // ... more commands!

}
```

The options exist so the user can pass in customizations to your module. In documenting your `vorpal` extension, you would lay out your supported options for the user.

## FAQ

### Why Vorpal?

```text
One, two! One, two! and through and through
The vorpal blade went snicker-snack!
He left it dead, and with its head
He went galumphing back.

Lewis Carroll, Jabberwocky
```

##### Life Goals:

- <s>Build a popular framework based on the [Jabberwocky](https://en.wikipedia.org/wiki/Jabberwocky) poem.</s>

### What is an "immersive" CLI app?

Node.js has a ton of really useful CLI applications. These are usually exposed through a single command, and often accompanied by subcommands. After the application is called from the CLI, the process executes the command and exits (the `git` command is an example).

Immersive CLI applications don't exit after your first command. They enter you into an isolated CLI environment independent of your underlying terminal, with a record of its own state and its own suite of commands. 

From this foundation, you can build applications with suites of commands and utilities for handling one particular thing very well.

### Uh, wasn't this called Vantage?

[Vantage](https://github.com/dthree/vantage) was built upon what you now see as Vorpal. As Vantage evolved, it became apparent that its CLI base had great potential for use as a broader framework, and this did not need a lot of the overhead behind Vantage's client / server interaction. As a result, the CLI functionality was extracted out and Vorpal was born. Vorpal was made as slim as possible: 1/5th of Vantage's size.

Vantage is now an *extension* of Vorpal and inherits all of its functionality, while building in rich client / server features. In other word's, it's Vorpal with wings. 

## Roadmap

- Suggest something!

## License

MIT
