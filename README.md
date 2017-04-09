# Vorpal


[![Build Status](https://travis-ci.org/dthree/vorpal.svg)](https://travis-ci.org/dthree/vorpal/)
<a href="https://www.npmjs.com/package/vorpal">
  <img src="https://img.shields.io/npm/dt/vorpal.svg" alt="NPM Downloads" />
</a>
[![Package Quality](http://npm.packagequality.com/shield/vorpal.svg)](http://packagequality.com/#?package=vorpal)
<a href="https://www.npmjs.com/package/vorpal">
  <img src="https://img.shields.io/npm/v/vorpal.svg" alt="NPM Version" />
</a>
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

> Conquer the command-line.

```text
              (O)
              <M
   o          <M
  /| ......  /:M\------------------------------------------------,,,,,,
(O)[ vorpal ]::@+}==========================================------------>
  \| ^^^^^^  \:W/------------------------------------------------''''''
   o          <W
              <W
              (O)
```

Vorpal is Node's first framework for building interactive CLI applications. With a simple and powerful API, Vorpal opens the door to a new breed of rich, immersive CLI environments like [cash](https://github.com/dthree/cash) and [wat](https://github.com/dthree/wat).

## Notice

This is now an [OPEN Open Source](http://openopensource.org/) project. I am not able to invest a significant amount of time into maintaining Vorpal and so am looking for volunteers who would like to be active maintainers of the project. If you are interested, shoot me a note.

## Contents

* [Introduction](#introduction)
* [Getting Started](#getting-started)
* [API](#api)
* [Extensions](#extensions)
* [FAQ](#faq)
* [License](#license)

## Introduction

Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vorpal is a framework for building immersive CLI applications built on an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer). Vorpal launches Node into an isolated CLI environment and provides a suite of API commands and functionality including:

* [x] Simple, powerful command creation
* [x] Supports optional, required and variadic arguments and options
* [x] Piped commands
* [x] Persistent command history
* [x] Built-in help
* [x] Built-in tabbed auto-completion
* [x] Command-specific auto-completion
* [x] Customizable prompts
* [x] Extensive terminal control
* [x] Custom event listeners
* [x] And more

Vorpal supports [community extensions](https://github.com/vorpaljs/awesome-vorpaljs), which empower it to do awesome things such as [piping commands to less](https://github.com/vorpaljs/vorpal-less), [importing commands live](https://github.com/vorpaljs/vorpal-use) or supporting a [built-in REPL](https://github.com/vorpaljs/vorpal-repl).

Made with :heart: by [dthree](https://github.com/dthree).

## Getting Started

##### Quick Start

Install `vorpal` into your project:

```bash
$ npm install vorpal --save
```

Create a `.js` file and add the following:

```js
const vorpal = require('vorpal')();

vorpal
  .command('foo', 'Outputs "bar".')
  .action(function(args, callback) {
    this.log('bar');
    callback();
  });

vorpal
  .delimiter('myapp$')
  .show();
```
This creates an instance of Vorpal, adds a command which logs "bar", sets the prompt delimiter to say "myapp$", and shows the prompt.

Run your project file. Your Node app has become a CLI:

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
    exit [options]    Exits instance of Vorpal.
    foo               Outputs "bar".

myapp~$
```

There's the basics. Once you get the hang of it, [follow this tutorial](http://developer.telerik.com/featured/creating-node-js-command-line-utilities-improve-workflow/) or read on to learn what else Vorpal can do.

##### Community

Questions? Use the `vorpal.js` StackOverflow tag for fast answers that help others, or jump into chat on Gitter.

- [Stack Overflow](http://stackoverflow.com/questions/tagged/vorpal.js) 
- [Gitter Chat](https://gitter.im/dthree/vorpal?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) 
- [Vorpal extensions](https://github.com/vorpaljs/awesome-vorpaljs#vorpal-extensions) 
- [Projects made with Vorpal](https://github.com/vorpaljs/awesome-vorpaljs) 
- [Follow @vorpaljs](https://twitter.com/vorpaljs) 

## [API](https://github.com/dthree/vorpal/wiki)

##### [Command](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command)
- [`vorpal.command`](https://github.com/dthree/vorpal/wiki/api-%7C-vorpal.command#vorpalcommandcommand-description)
- [`command.description`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commanddescriptionstring)
- [`command.alias`](https://github.com/dthree/vorpal/wiki/api-%7C-vorpal.command#commandaliasname-names)
- [`command.parse`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandparseparsefunction)
- [`command.option`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandoptionstring-description)
- [`command.hidden`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandhidden)
- [`command.remove`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandremove)
- [`command.help`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandhelp)
- [`command.autocomplete`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandautocompletearray-or-object-or-function)
- [`command.action`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandactionfunction)
- [`command.cancel`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.command#commandcancelfunction)

##### [Mode](https://github.com/dthree/vorpal/wiki/API-|-vorpal.mode)
- [`vorpal.mode`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal.mode#vorpalmodecommand-description)
- [`mode.delimiter`](https://github.com/dthree/vorpal/wiki/API-|-vorpal.mode#modedelimiterstring)
- [`mode.init`](https://github.com/dthree/vorpal/wiki/API-|-vorpal.mode#modeinitfunction)
- [`mode.action`](https://github.com/dthree/vorpal/wiki/API-|-vorpal.mode#modeactionfunction)

##### [Catch](https://github.com/dthree/vorpal/wiki/API-|-vorpal.catch)
- [`vorpal.catch`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal.catch#catchcommand-description)

##### [CommandInstance](https://github.com/dthree/vorpal/wiki/API-|-CommandInstance)
- [`commandInstance.log`](https://github.com/dthree/vorpal/wiki/API-%7C-CommandInstance#commandinstancelogstring-strings)
- [`commandInstance.prompt`](https://github.com/dthree/vorpal/wiki/API-%7C-CommandInstance#commandinstancepromptobject-callback)
- [`commandInstance.delimiter`](https://github.com/dthree/vorpal/wiki/API-%7C-CommandInstance#commandinstancedelimiterstring)

##### [UI](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui)
- [`ui.delimiter`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uidelimitertext)
- [`ui.input`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uiinputtext)
- [`ui.imprint`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uiimprint)
- [`ui.submit`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uisubmittext)
- [`ui.cancel`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uicancel)
- [`ui.imprint`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uiimprint)
- [`ui.redraw`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uiredrawtext-text)
- [`ui.redraw.clear`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uiredrawclear)
- [`ui.redraw.done`](https://github.com/dthree/vorpal/wiki/api-|-vorpal.ui#uiredrawdone)

##### [Vorpal](https://github.com/dthree/vorpal/wiki/API-|-vorpal)
- [`.parse`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalparseargv-options)
- [`.delimiter`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpaldelimiterstring)
- [`.show`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalshow)
- [`.find`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalfindstring)
- [`.exec`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalexeccommand-callback)
- [`.execSync`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalexecsynccommand-options)
- [`.log`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpallogstring-strings)
- [`.history`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalhistoryid)
- [`.localStorage`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpallocalstorageid)
- [`.help`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalhelpfunction)
- [`.pipe`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpalpipefunction)
- [`.use`](https://github.com/dthree/vorpal/wiki/API-%7C-vorpal#vorpaluseextension)

##### [Events](https://github.com/dthree/vorpal/wiki/Docs-%7C-Events)


## Extensions

You can build your own Vorpal commands and extensions.

- [List of awesome extensions](https://github.com/vorpaljs/awesome-vorpaljs#vorpal-extensions)
- [Building your own extension](https://github.com/dthree/vorpal/wiki/Docs-%7C-Creating-Extensions)


## [FAQ](https://github.com/dthree/vorpal/wiki/FAQ)

- [What is an "immersive CLI app?"](https://github.com/dthree/vorpal/wiki/FAQ#what-is-an-immersive-cli-app)
- [Wasn't this called Vantage?](https://github.com/dthree/vorpal/wiki/FAQ#uh-wasnt-this-called-vantage)


## Why Vorpal?

```text
One, two! One, two! and through and through
The vorpal blade went snicker-snack!
He left it dead, and with its head
He went galumphing back.

Lewis Carroll, Jabberwocky
```


##### Life Goals:

- <s>Build a popular framework based on the [Jabberwocky](https://en.wikipedia.org/wiki/Jabberwocky) poem.</s>


## License

MIT © [David Caccavella](https://github.com/dthree)
