// @flow
/* eslint-disable no-use-before-define */

import typeof Command from './command';
import typeof CommandInstance from './command-instance';
import typeof Session from './session';

export type Argument = {
  name: string,
  required: boolean,
  variadic: boolean,
};

export type CommandArgs = {
  options: { [opt: string]: string | number | boolean },
  [arg: string]: string | string[],
};

export type CommandExecutionItem = {
  args: string | CommandArgs, // From buildCommandArgs()
  command: string, // The input on the command line
  commandObject?: Command,
  fn: (ci: CommandInstance, args: CommandArgs) => void, // TODO response value?
  options: ModeOptions,
  pipes: string[] | CommandInstance[], // From parseCommand()
  session: Session,
  sync: boolean,
};

export type ModeOptions = {
  message?: string,
  sessionId?: string,
};
