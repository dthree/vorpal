declare module 'log-update' {
  declare export type LogUpdate = {
    (output: string): void,
    clear: () => void,
    done: () => void,
  };

  declare export default LogUpdate;
}
