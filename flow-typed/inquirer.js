import type readline from 'readline';

declare module 'inquirer' {
  declare type Question = {
    type?: 'input' | 'confirm' | 'list' | 'rawlist' | 'expand' | 'checkbox' | 'password' | 'editor',
    name?: string,
    message?: string | Function,
    default?: *, // TODO
    choices?: *, // TODO
    validate?: (input: string, hash: string) => boolean,
    filter?: (input: string) => string,
    when?: boolean | (hash: string) => boolean,
    pageSize?: number,
  };

  declare type Answer = {
    name: string,
    confirm?: boolean,
    input?: string,
    list?: string,
    rawlist?: string,
  };

  declare type AnswerHash = { [name: string]: string }; // TODO

  declare export class Separator {
    line: string;
    type: string;
    constructor(line: string): void;
    toString(): string;
    static exclude(obj: Object): boolean;
  }

  declare export class UI {
    rl: readline$Interface;
    constructor(options?: Object): void;
    close(): void;
    onForceClose(): void;
  }

  declare export class Prompt extends UI {
    bottomBar: string;
    clean(): this;
    enforceLF(string: string): string;
    render(): this;
    updateBottomBar(bottomBar: string): this;
    write(message: string): void;
    writeLog(data: string): this;
  }

  declare export class PromptUI extends UI {
    constructor(prompts, options?: Object): void;
    run(questions: Question | Question[]): Promise<AnswerHash>; // TODO Arg can be rx.Observable
    onCompletion(answers: AnswerHash): AnswerHash;
  }

  declare export default {
    prompts: Object, // TODO
    Separator: Separator,
    ui: {
      BottomBar: Prompt,
      Prompt: Prompt,
    },
  };
}
