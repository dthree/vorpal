// @flow
import Command from '../command';
import matchCommand from './matchCommand';

/**
 * Prepares a command and all its parts for execution.
 */
export default function parseCommand(commandName: string, commands: Command[] = []): {
  command: string,
  match: ?Command,
  matchArgs: string,
  pipes: string[],
} {
  let pipes = [];
  let match = null;
  let matchArgs = '';
  let matchParts = {};
  let nextCommand = commandName;

  function parsePipes() {
    // First, split the command by pipes naively.
    // This will split command arguments in half when the argument contains a pipe character.
    // Say "(Vorpal|vorpal)" will be split into ['say "(Vorpal', 'vorpal)'] which isn't good.
    const naivePipes = String(nextCommand).trim().split('|');

    // Contruct empty array to place correctly split commands into.
    const newPipes = [];

    // We will look for pipe characters within these quotes to rejoin together.
    const quoteChars = ['"', '\'', '`'];

    // This will expand to contain one boolean key for each type of quote.
    // The value keyed by the quote is toggled off and on as quote type is opened and closed.
    // Example { "`": true, "'": false } would mean that there is an open angle quote.
    const quoteTracker = {};

    // The current command piece before being rejoined with it's over half.
    // Since it's not common for pipes to occur in commands,
    // this is usually the entire command pipe.
    let commandPart = '';

    // Loop through each naive pipe.
    naivePipes.forEach((possiblePipe, index) => {
      // It's possible/likely that this naive pipe is the whole pipe
      // if it doesn't contain an unfinished quote.
      commandPart += possiblePipe;

      // Loop through each individual character in the possible pipe
      // tracking the opening and closing of quotes.
      for (let i = 0; i < possiblePipe.length; i += 1) {
        const char = possiblePipe[i];

        if (quoteChars.includes(char)) {
          quoteTracker[char] = !quoteTracker[char];
        }
      }

      // Does the pipe end on an unfinished quote?
      const inQuote = quoteChars.some(quoteChar => !!quoteTracker[quoteChar]);

      // If the quotes have all been closed or this is the last
      // possible pipe in the array, add as pipe.
      if (!inQuote || index === naivePipes.length - 1) {
        newPipes.push(commandPart.trim());
        commandPart = '';

      // Quote was left open. The pipe character was previously
      // removed when the array was split.
      } else {
        commandPart += '|';
      }
    });

    // Set the first pipe to command and the rest to pipes.
    nextCommand = newPipes.shift();
    pipes = pipes.concat(newPipes);
  }

  function parseMatch() {
    matchParts = matchCommand(nextCommand, commands);
    match = matchParts.command;
    matchArgs = matchParts.args;
  }

  parsePipes();
  parseMatch();

  if (match && typeof match._parse === 'function') {
    nextCommand = match._parse(nextCommand, matchParts.args || '');

    parsePipes();
    parseMatch();
  }

  return {
    command: nextCommand,
    match,
    matchArgs,
    pipes,
  };
}
