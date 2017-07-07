// @flow
import Command from '../command';

/**
 * Run a raw command string, e.g. foo -bar against a given list of commands,
 * and if there is a match, parse the results.
 */
export default function matchCommand(commandName: string, commands: Command[] = []): {
  args: string,
  command: ?Command,
} {
  const parts = commandName.trim().split(' ');
  let match = null;
  let matchArgs = '';

  for (let i = 0; i < parts.length; i += 1) {
    const subcommandName = String(parts.slice(0, parts.length - i).join(' ')).trim();

    match = commands.find(command => command._name === subcommandName) || match;

    if (!match) {
      match = commands.find(command => command._aliases.includes(subcommandName)) || match;
    }

    if (match) {
      matchArgs = parts.slice(parts.length - i, parts.length).join(' ');
      break;
    }
  }

  // If there's no command match, check if the there's a `catch` command,
  // which catches all missed commands.
  if (!match) {
    match = commands.find(command => command._catch);

    // If there is one, we still need to make sure we aren't
    // partially matching command groups, such as `do things` when
    // there is a command `do things well`. If we match partially,
    // we still want to show the help menu for that command group.
    if (match) {
      let wordMatch = false;

      commands.some((command) => {
        const catchParts = String(command._name).split(' ');
        const commandParts = String((match && match.command) || '').split(' ');
        let matchAll = true;

        for (let i = 0; i < commandParts.length; i += 1) {
          if (catchParts[i] !== commandParts[i]) {
            matchAll = false;
            break;
          }
        }

        if (matchAll) {
          wordMatch = true;

          return true;
        }

        return false;
      });

      if (wordMatch) {
        match = null;
      } else {
        matchArgs = commandName;
      }
    }
  }

  return {
    args: matchArgs,
    command: match || null,
  };
}
