declare module 'chalk' {
  declare export type Chalk = {
    blue(msg: string): string,
    gray(msg: string): string,
    green(msg: string): string,
    magenta(msg: string): string,
    red(msg: string): string,
    reset(msg: string): string,
    yellow(msg: string): string,
  };

  declare export default Chalk;
}
