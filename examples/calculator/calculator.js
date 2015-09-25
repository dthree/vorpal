'use strict';

/**
 * Module dependencies.
 */

var Vorpal = require('./../../lib/vorpal');
var logUpdate = require('log-update');
var chalk = require('chalk');
var util = require('util');

/**
 * Variable declarations.
 */

var vorpal = new Vorpal();

vorpal.command('delim <string>', 'change delimiter to something else.')
  .action(function (args, cb) {
    this.delimiter(args.string);
    cb();
  });

vorpal.command('say <words>', 'say something')
  .action(function (args, cb) {
    this.log(args.words);
    cb();
  });

vorpal.command("destroy database").action(function(args, cb){
  var self = this;
  this.prompt({
    type: "input",
    name: "continue",
    default: false,
    message: "That sounds like a really bad idea. Continue?",
  }, function(result){
    self.log(result);
    cb();
  });
});

vorpal.command('c', 'say something')
  .action(function (args, cb) {
    var self = this;
    setInterval(function(){
      var arr = [];
      for (var i = 0; i < process.stdout.rows - 1; ++i) {
        arr.push(Math.random());
      }
      logUpdate(arr.join('\n'));
    }, 10)
    cb();
  });

vorpal.command('b', 'say something')
  .action(function (args, cb) {
    var obj = {
      'c': "Rock",
      'd': "Paper",
      'e': "Scissors"
    }
    var clr = {
      'c': "blue",
      'd': "white",
      'e': "yellow"
    }
    var chalk = require('chalk');
    function gen() {
      var rand1 = obj['cde'.charAt(Math.floor(Math.random()*3))];
      var rand2 = clr['cde'.charAt(Math.floor(Math.random()*3))];
      return chalk[rand2](rand1) + ' ';
    }
    this.log('------START-----')
    for (var i = 0; i < 200; ++i) {
      this.log(gen() + gen() + gen() + gen() + gen() + gen());
    }
    this.log('------END-----')
    cb();
  });

function padRows(str, n) {
  for (var i = 0; i < n; ++i) {
    str = '\n' + str;
  }
  return str;
}

var help = `

                   SUMMARY OF LESS COMMANDS

      Commands marked with * may be preceded by a number, N.
      Notes in parentheses indicate the behavior if N is given.
      A key preceded by a caret indicates the Ctrl key; thus ^K is ctrl-K.

  h  H                 Display this help.
  q  :q  Q  :Q  ZZ     Exit.
  ---------------------------------------------------------------------------

                           MOVING

  e  ^E  j  ^N  CR  *  Forward  one line   (or N lines).
  y  ^Y  k  ^K  ^P  *  Backward one line   (or N lines).
  f  ^F  ^V  SPACE  *  Forward  one window (or N lines).
  b  ^B  ESC-v      *  Backward one window (or N lines).
  z                 *  Forward  one window (and set window to N).
  w                 *  Backward one window (and set window to N).
  ESC-SPACE         *  Forward  one window, but don't stop at end-of-file.
  d  ^D             *  Forward  one half-window (and set half-window to N).
  u  ^U             *  Backward one half-window (and set half-window to N).
  ESC-)  RightArrow *  Left  one half screen width (or N positions).
  ESC-(  LeftArrow  *  Right one half screen width (or N positions).
  F                    Forward forever; like "tail -f".
  r  ^R  ^L            Repaint screen.
  R                    Repaint screen, discarding buffered input.
        ---------------------------------------------------
        Default "window" is the screen height.
        Default "half-window" is half of the screen height.
  ---------------------------------------------------------------------------

                          SEARCHING

  /pattern          *  Search forward for (N-th) matching line.
  ?pattern          *  Search backward for (N-th) matching line.
  n                 *  Repeat previous search (for N-th occurrence).
  N                 *  Repeat previous search in reverse direction.
  ESC-n             *  Repeat previous search, spanning files.
  ESC-N             *  Repeat previous search, reverse dir. & spanning files.
  ESC-u                Undo (toggle) search highlighting.
  &pattern          *  Display only matching lines
        ---------------------------------------------------
        A search pattern may be preceded by one or more of:
        ^N or !  Search for NON-matching lines.
        ^E or *  Search multiple files (pass thru END OF FILE).
        ^F or @  Start search at FIRST file (for /) or last file (for ?).
        ^K       Highlight matches, but don't move (KEEP position).
        ^R       Don't use REGULAR EXPRESSIONS.
  ---------------------------------------------------------------------------

                           JUMPING

  g  <  ESC-<       *  Go to first line in file (or line N).
  G  >  ESC->       *  Go to last line in file (or line N).
  p  %              *  Go to beginning of file (or N percent into file).
  t                 *  Go to the (N-th) next tag.
  T                 *  Go to the (N-th) previous tag.
  {  (  [           *  Find close bracket } ) ].
  }  )  ]           *  Find open bracket { ( [.
  ESC-^F <c1> <c2>  *  Find close bracket <c2>.
  ESC-^B <c1> <c2>  *  Find open bracket <c1>
        ---------------------------------------------------
        Each "find close bracket" command goes forward to the close bracket
          matching the (N-th) open bracket in the top line.
        Each "find open bracket" command goes backward to the open bracket
          matching the (N-th) close bracket in the bottom line.

  m<letter>            Mark the current position with <letter>.
  '<letter>            Go to a previously marked position.
  ''                   Go to the previous position.
  ^X^X                 Same as '.
        ---------------------------------------------------
        A mark is any upper-case or lower-case letter.
        Certain marks are predefined:
             ^  means  beginning of the file
             $  means  end of the file
  ---------------------------------------------------------------------------

                        CHANGING FILES

  :e [file]            Examine a new file.
  ^X^V                 Same as :e.
  :n                *  Examine the (N-th) next file from the command line.
  :p                *  Examine the (N-th) previous file from the command line.
  :x                *  Examine the first (or N-th) file from the command line.
  :d                   Delete the current file from the command line list.
  =  ^G  :f            Print current file name.
 ---------------------------------------------------------------------------

                    MISCELLANEOUS COMMANDS

  -<flag>              Toggle a command line option [see OPTIONS below].
  --<name>             Toggle a command line option, by name.
  _<flag>              Display the setting of a command line option.
  __<name>             Display the setting of an option, by name.
  +cmd                 Execute the less cmd each time a new file is examined.

  !command             Execute the shell command with $SHELL.
  |Xcommand            Pipe file between current pos & mark X to shell command.
  v                    Edit the current file with $VISUAL or $EDITOR.
  V                    Print version number of "less".
 ---------------------------------------------------------------------------

                           OPTIONS

        Most options may be changed either on the command line,
        or from within less by using the - or -- command.
        Options may be given in one of two forms: either a single
        character preceded by a -, or a name preceded by --.

  -?  ........  --help
                  Display help (from command line).
  -a  ........  --search-skip-screen
                  Search skips current screen.
  -A  ........  --SEARCH-SKIP-SCREEN
                  Search starts just after target line.
  -b [N]  ....  --buffers=[N]
                  Number of buffers.
  -B  ........  --auto-buffers
                  Don't automatically allocate buffers for pipes.
  -c  ........  --clear-screen
                  Repaint by clearing rather than scrolling.
  -d  ........  --dumb
                  Dumb terminal.
  -D [xn.n]  .  --color=xn.n
                  Set screen colors. (MS-DOS only)
  -e  -E  ....  --quit-at-eof  --QUIT-AT-EOF
                  Quit at end of file.
  -f  ........  --force
                  Force open non-regular files.
  -F  ........  --quit-if-one-screen
                  Quit if entire file fits on first screen.
  -g  ........  --hilite-search
                  Highlight only last match for searches.
  -G  ........  --HILITE-SEARCH
                  Don't highlight any matches for searches.
  -h [N]  ....  --max-back-scroll=[N]
                  Backward scroll limit.
  -i  ........  --ignore-case
                  Ignore case in searches that do not contain uppercase.
  -I  ........  --IGNORE-CASE
                  Ignore case in all searches.
  -j [N]  ....  --jump-target=[N]
                  Screen position of target lines.
  -J  ........  --status-column
                  Display a status column at left edge of screen.
  -k [file]  .  --lesskey-file=[file]
                  Use a lesskey file.
  -K            --quit-on-intr
                  Exit less in response to ctrl-C.
  -L  ........  --no-lessopen
                  Ignore the LESSOPEN environment variable.
  -m  -M  ....  --long-prompt  --LONG-PROMPT
                  Set prompt style.
  -n  -N  ....  --line-numbers  --LINE-NUMBERS
                  Don't use line numbers.
  -o [file]  .  --log-file=[file]
                  Copy to log file (standard input only).
  -O [file]  .  --LOG-FILE=[file]
                  Copy to log file (unconditionally overwrite).
  -p [pattern]  --pattern=[pattern]
                  Start at pattern (from command line).
  -P [prompt]   --prompt=[prompt]
                  Define new prompt.
  -q  -Q  ....  --quiet  --QUIET  --silent --SILENT
                  Quiet the terminal bell.
  -r  -R  ....  --raw-control-chars  --RAW-CONTROL-CHARS
                  Output "raw" control characters.
  -s  ........  --squeeze-blank-lines
                  Squeeze multiple blank lines.
  -S  ........  --chop-long-lines
                  Chop (truncate) long lines rather than wrapping.
  -t [tag]  ..  --tag=[tag]
                  Find a tag.
  -T [tagsfile] --tag-file=[tagsfile]
                  Use an alternate tags file.
  -u  -U  ....  --underline-special  --UNDERLINE-SPECIAL
                  Change handling of backspaces.
  -V  ........  --version
                  Display the version number of "less".
  -w  ........  --hilite-unread
                  Highlight first new line after forward-screen.
  -W  ........  --HILITE-UNREAD
                  Highlight first new line after any forward movement.
  -x [N[,...]]  --tabs=[N[,...]]
                  Set tab stops.
  -X  ........  --no-init
                  Don't use termcap init/deinit strings.
  -y [N]  ....  --max-forw-scroll=[N]
                  Forward scroll limit.
  -z [N]  ....  --window=[N]
                  Set size of window.
  -" [c[c]]  .  --quotes=[c[c]]
                  Set shell quote characters.
  -~  ........  --tilde
                  Don't display tildes after end of file.
  -# [N]  ....  --shift=[N]
                  Horizontal scroll amount (0 = one half screen width)
      ........  --no-keypad
                  Don't send termcap keypad init/deinit strings.
      ........  --follow-name
                  The F command changes files if the input file is renamed.


 ---------------------------------------------------------------------------

                          LINE EDITING

        These keys can be used to edit text being entered
        on the "command line" at the bottom of the screen.

 RightArrow                       ESC-l     Move cursor right one character.
 LeftArrow                        ESC-h     Move cursor left one character.
 ctrl-RightArrow  ESC-RightArrow  ESC-w     Move cursor right one word.
 ctrl-LeftArrow   ESC-LeftArrow   ESC-b     Move cursor left one word.
 HOME                             ESC-0     Move cursor to start of line.
 END                              ESC-$     Move cursor to end of line.
 BACKSPACE                                  Delete char to left of cursor.
 DELETE                           ESC-x     Delete char under cursor.
 ctrl-BACKSPACE   ESC-BACKSPACE             Delete word to left of cursor.
 ctrl-DELETE      ESC-DELETE      ESC-X     Delete word under cursor.
 ctrl-U           ESC (MS-DOS only)         Delete entire line.
 UpArrow                          ESC-k     Retrieve previous command line.
 DownArrow                        ESC-j     Retrieve next command line.
 TAB                                        Complete filename & cycle.
 SHIFT-TAB                        ESC-TAB   Complete filename & reverse cycle.
 ctrl-L                                     Complete filename, list all.


HELP -- END -- Press g to see it again, or q when done

`;


vorpal.command('less', 'less function')
  .action(function (args, cb) {
    var self = this;
    var stdin = args.stdin || '';
    
    this._less = this._less || {
      stdin: ''
    }
    this._less.stdin += stdin + '\n';

    function render(append) {
      append = append || '';
      var stdn = (self._less.helpMode) ? self._less.help : String(self._less.stdin);
      var cursor = (self._less.helpMode) ? 'helpCursor' : 'cursor';
      var rows = stdn.split('\n').length;
      var diff = numRows - rows;
      var numRows = process.stdout.rows - 1;
      if (diff > 0) {
        stdn = padRows(stdn, diff);
      }
      stdn = stdn.split('\n').slice(self._less[cursor], self._less[cursor] + numRows).join('\n');
      stdn = stdn;
      logUpdate(stdn + '#' + append + '#' + stdn.split('\n').length + '|||' + self._less[cursor]);
    }

    function keyHandler(data) {
      var numRows = process.stdout.rows - 1;
      var lines = String(self._less.stdin).split('\n').length;
      var bottom = lines - numRows;
      
      data.e.key = data.e.key || {}

      var ctrl = data.e.key.ctrl;
      var eValue = (util.inspect(data.e.value).indexOf('\\u') > -1) ? undefined : data.e.value;
      eValue = (String(eValue).trim() === '') ? undefined : eValue;
      var eName = data.e.key.name;

      var key = eValue || eName;
      key = (key === 'escape') ? 'ESC' : key;
      var keyMods = (ctrl) ? '^' + key : key;
      var keyCache = self._less.cache + key;
      var alphaCache = String(keyCache).replace(/^[0-9]+/g, '');
      var numCache = String(keyCache).replace(/[^0-9]/g, '');
      var factor = (!isNaN(numCache) && numCache > 0) ? parseFloat(numCache) : 1;

      function has(arr) {
        arr = (Array.isArray(arr)) ? arr : [arr];
        return (arr.indexOf(key) > -1 || arr.indexOf(alphaCache) > -1 || arr.indexOf(keyMods) > -1);
      }

      //console.log(data);
      //console.log(key);

      var match = true;
      var stop = true;
      var cursor = (self._less.helpMode) ? 'helpCursor' : 'cursor';
      var alreadyBelowBottom = (self._less.cursor > bottom);
      var crs = self._less[cursor];

      var ignore = ['backspace', 'left', 'right', '`'];

      if (has(['ESC ', 'ESCspace'])) {
        crs += (numRows * factor);
        stop = false;
      } else if (has(['up', 'y', '^Y', 'k', '^K', '^p'])) {
        crs -= factor;
      } else if (has(['down', 'e', '^e', '^n', 'j', 'enter'])) {
        crs += factor;
      } else if (has(['pageup', 'b', '^B', 'ESCv', 'w'])) {
        crs -= (numRows * factor);
      } else if (has(['pagedown', 'f', '^F', '^v', 'space', ' ', 'z'])) {
        crs += (numRows * factor);
      } else if (has(['u', '^u'])) {
        crs -= (Math.floor(numRows / 2) * factor);
      } else if (has(['d', '^d'])) {
        crs += (Math.floor(numRows / 2) * factor);
      } else if (has(['g', 'home'])) {
        crs = 0;
      } else if (has(['G', 'end'])) {
        crs = bottom;
      } else if (has(['h', 'H'])) {
        self._less.helpMode = true;
      } else if (has(['q', ':q', 'Q', ':Q', 'ZZ'])) {
        if (self._less.helpMode) {
          self._less.helpMode = false;
        } else {
          quit();
          return;
        }
      } else if (has(ignore)) {
        // Catch and do nothing...
      } else {
        match = false;
      }

      self._less.cache = (!match) ? keyCache: '';
      crs = (crs < 0) ? 0 : crs;
      crs = (crs > bottom && (stop === true) && !alreadyBelowBottom) ? bottom : crs;

      var delimiter;
      if (crs >= bottom && self._less.helpMode) {
        delimiter = chalk.inverse('HELP -- END -- Press g to see it again, or q when done ');
      } else if (crs >= bottom) {
        delimiter = chalk.inverse('END ');
      } else if (self._less.helpMode) {
        delimiter = chalk.inverse('HELP -- Press RETURN for more, or q when done ');
      } else if (String(self._less.cache).trim() !== '') {
        delimiter = ' ';
      } else {
        delimiter = ':';
      }
      //vorpal.ui._activePrompt.opt.message = delimiter;
      vorpal.ui.delimiter(delimiter);

      // Re-assign the permanent cursor.
      self._less[cursor] = crs;

      render('|||||||||' + chalk.yellow(factor) + '|' + numCache + '|' + chalk.cyan(require('util').inspect( + '|' + key + '|' + keyMods + '|' + keyCache + '|' + eValue + '@@' + eName + '@@')));

      if (crs < bottom && !self._less.helpMode) {
        vorpal.ui.write(self._less.cache);
        // Want to put cursor (inverse), but 
        // backspace then gives ansi whackiness.
        // vorpal.ui.write(self._less.cache + chalk.inverse(' '));
      }
    }

    function quit() {
      vorpal.removeListener('keypress', keyHandler);
      vorpal.ui._activePrompt.onEnd({isValid: true, value: ''});
      logUpdate(padRows('', process.stdout.rows - 1));
      logUpdate.done();
      cb();
    }

    function runPrompt() {
      self.prompt({
        type: "input",
        name: "continue",
        message: ":",
        validate: function(){
          // Simulate enter keypress.
          keyHandler({
            e: { key: { name: 'enter' }}
          });
          return false;
        },
      }, function(result){
      });
    }

    if (!this._less.mid) {
      //this.log('Not Mid!!!', process.stdout.rows);
      logUpdate.done();
      this._less.mid = true;
      this._less.cursor = 0;
      this._less.cache = '';
      this._less.numbers = '';

      this._less.help = help;
      this._less.helpMode = false;
      this._less.helpCursor = 0;

      runPrompt();
      
      vorpal.on('keypress', keyHandler);
      render();
    } else {
      render();
      cb();
    }
  })
  .done(function() {
  });

vorpal.command('reverse [words]', 'append bar to stdin')
  .alias('r')
  .action(function (args, cb) {
    var stdin = args.stdin || args.words;
    stdin = String(stdin).split('').reverse().join('');
    this.log(stdin);
    cb();
  });

vorpal.command('array [string]', 'convert string to an array.')
  .action(function (args, cb) {
    var stdin = args.stdin || args.string;
    stdin = String(stdin).split('');
    this.log(stdin);
    cb();
  });

vorpal.command('do [text...]', 'Recite')
  .alias('addition')
  .alias('plus')
  .autocompletion(function (text, iteration, cb) {
    cb(undefined, 'do ' + text + ' re');
  })
  .action(function (args, cb) {
    var result = this.match('r', ['red', 'reset']);
    this.log(result);
    cb();
  });

vorpal.command('add [numbers...]', 'Adds numbers together')
  .alias('addition')
  .alias('plus')
  .action(function (args, cb) {
    var numbers = args.numbers;
    var sum = 0;
    for (var i = 0; i < numbers.length; ++i) {
      sum += parseFloat(numbers[i]);
    }
    this.log(sum);
    cb(undefined, sum);
  });

vorpal.command('double [values...]', 'Doubles a value on each tab press')
  .autocompletion(function (text, iteration, cb) {
    if (iteration > 1000000) {
      cb(undefined, ['cows', 'hogs', 'horses']);
    } else {
      var number = String(text).trim();
      if (!isNaN(number)) {
        number = (number < 1) ? 1 : number;
        cb(undefined, 'double ' + number * 2);
      } else {
        cb(undefined, 'double 2');
      }
    }
  })
  .action(function (args, cb) {
    cb();
  });

vorpal.command('args [items...]', 'Shows args.')
  .option('-d')
  .option('-a')
  .option('--save')
  .action(function (args, cb) {
    this.log(args);
    cb();
  });

vorpal
  .mode('repl', 'Enters REPL Mode.')
  .init(function (args, cb) {
    this.log('Entering REPL Mode.');
    cb();
  })
  .action(function (command, cb) {
    console.log(command);
    var res = eval(command);
    this.log(res);
    cb(res);
  });

//vorpal.exec('b | less');

vorpal
  .delimiter('calc:')
  .show()
  .parse(process.argv);

/*
var rl = require('readline');
rl = rl.createInterface(process.stdin, process.stdout);
rl.on('keypress', function(data, and){
  //console.log(data, and);
})
*/


