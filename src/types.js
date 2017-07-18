// @flow
/* eslint-disable no-use-before-define */

import type Command from './Command';
import type CommandInstance from '../lib/command-instance';
import type Session from '../lib/session';

export type ActionCallback = (
  args: CommandArgs,
  callback: (error: ?Error) => void,
) => ?Promise<string>;

export type Autocomplete =
  // Array of strings
  string[] |
  // Function that returns an array of strings
  () => string[] |
  // Promise that returns an array of strings
  () => Promise<string[]> |
  // Callback that returns an array of strings
  (input: string, callback: () => string[]) => void;

export type CancelCallback = () => void;

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

export type DoneCallback = () => void;

export type HelpCallback = (args: CommandArgs) => void;

export type InitCallback = (args: CommandArgs) => void;

// The entire command, with arguments and options, entered in the command line
export type InputCommand = string;

export type LoggerCallback = (...args: *[]) => void;

export type ModeOptions = {
  message?: string,
  sessionId?: string,
};

export type OptionOptions = {
  autocomplete?: ?Autocomplete,
  default?: *,
};

export type ParseCallback = (inputCommand: InputCommand, inputArgs: string) => InputCommand;

export type UseCallback = (command: Command) => void;

export type ValidateCallback = (args: CommandArgs) => void;
