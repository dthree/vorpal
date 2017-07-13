declare module 'minimist' {
  declare export type CLIParserOptions = {
    alias?: { [arg: string]: string | string[] },
    boolean?: boolean | string | string[],
    default?: { [arg: string]: string | boolean | number | null },
    stopEarly?: boolean,
    string?: string | string[],
    unknown?: (arg: string) => boolean,
    '--'?: boolean,
  };

  declare export type CLIArgs = {
    _: string | string[],
    '--'?: string | string[],
    [key: string]: string | boolean | number,
  }

  declare export default function minimist(args: string[], opts?: CLIParserOptions): CLIArgs;
}
