declare module 'node-localstorage' {
  declare export class LocalStorage {
    constructor(path: string, quota?: number): void;
    clear(): void;
    getItem(key: string): ?string;
    key(index: number): ?string;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  }

  declare export class JSONStorage extends LocalStorage {
    setItem(key: string, value: *): void;
  }
}
