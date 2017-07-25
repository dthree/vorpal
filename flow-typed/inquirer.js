import type readline from 'readline';

declare module 'inquirer' {
  declare type Choice = string | {
    name: string,
    value: string,
    short: string,
  };

  declare type Question = {
    type?: 'input' | 'confirm' | 'list' | 'rawlist' | 'expand' | 'checkbox' | 'password' | 'editor',
    name?: string,
    message?: string | Function,
    default?: string | number | string[] | number[] | (answers: string[]) => *,
    choices?: Choice[] | (answers: string[]) => Choice[],
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

  declare type AnswerHash = { [name: string]: Answer };

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

  declare export class BottomBar extends UI {
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
    run(questions: Question | Question[]): Promise<AnswerHash>;
    onCompletion(answers: AnswerHash): AnswerHash;
    processQuestion(question: Question): *;
    fetchAnswer(question: Question): *;
    setDefaultType(question: Question): *;
    filterIfRunnable(question: Question): *;
  }

  declare export class ScreenManager {
    rl: readline$Interface;
    constructor(rl: readline$Interface): void;
    render(content: string, bottomContent: string): void;
    clean(): void;
    done(): void;
    normalizedCliWidth(): void;
  }

  declare export class Prompt {
    rl: readline$Interface;
    screen: ScreenManager;
    opt: Question;
    constructor(question: Question, rl: readline$Interface): void;
    run(): Promise<*>;
    getQuestion(): string;
    throwParamError(name: string): void;
  }

  declare export default {
    prompts: { [name: string]: Question },
    Separator: Separator,
    ui: {
      BottomBar: BottomBar,
      Prompt: PromptUI,
    },
    prompt(questions: Question): Promise<AnswerHash>,
    registerPrompt(name: string, prompt: Question): void;
    restoreDefaultPrompts(): void;
  };
}
