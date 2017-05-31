/**
 * Run a raw command string, e.g. foo -bar against a given list of commands,
 * and if there is a match, parse the results.
 */
module.exports = function matchCommand(command, commands = []) {
  const parts = String(command).trim().split(' ');
  let match;
  let matchArgs;

  for (let i = 0; i < parts.length; i += 1) {
    const subcommand = String(parts.slice(0, parts.length - i).join(' ')).trim();
    match = commands.find(cmd => cmd._name === subcommand);

    if (match) {
      matchArgs = parts.slice(parts.length - i, parts.length).join(' ');
      break;

    } else {
      // eslint-disable-next-line no-loop-func
      commands.forEach((cmd) => {
        match = command._aliases.includes(subcommand) ? cmd : match;
      });
    }
  }

  // If there's no command match, check if the there's a `catch` command,
  // which catches all missed commands.
  if (!match) {
    match = commands.find(cmd => cmd._catch === true);
  }

  // If there is one, we still need to make sure we aren't
  // partially matching command groups, such as `do things` when
  // there is a command `do things well`. If we match partially,
  // we still want to show the help menu for that command group.
  if (match) {
    let wordMatch = false;

    commands.some((cmd) => {
      const catchParts = String(cmd._name).split(' ');
      const commandParts = String(match.command).split(' ');
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
      matchArgs = command;
    }
  }

  return {
    command,
    args: matchArgs,
  };
};
