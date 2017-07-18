// @flow

import { inspect } from 'util';
import pad from './utils/pad';

import type { LoggerCallback } from './types';

const BUFFER_WIDTH: number = 10;
const ESCAPE_CODE_PATTERN: RegExp = /\u001B\[\d+m/gm;

export default class Logger {
  logger: LoggerCallback;

  constructor(logger?: LoggerCallback) {
    // eslint-disable-next-line no-console
    this.logger = logger || console.log;
  }

  br(): this {
    return this.log(' ');
  }

  cols(...args: *[]): this {
    // $FlowIgnore
    const width = process.stdout.columns;
    const input = args;
    const lines = [];
    let pads = 0;
    let padsWidth = 0;
    let cols = 0;
    let colsWidth = 0;

    args.forEach((arg) => {
      if (typeof arg === 'number') {
        padsWidth += arg;
        pads += 1;

      } else if (Array.isArray(arg) && typeof arg[0] === 'number') {
        padsWidth += arg[0];
        pads += 1;
      }
    });

    cols = args.length - pads;
    colsWidth = Math.floor((width - padsWidth) / cols);

    const appendLine = () => {
      let line = '';
      let done = true;

      for (let i = 0; i < input.length; i += 1) {
        if (typeof input[i] === 'number') {
          line += pad('', input[i]);

        } else if (Array.isArray(input[i]) && typeof input[i][0] === 'number') {
          line += pad('', input[i][0], input[i][1]);

        } else {
          const chosenWidth = colsWidth + 0;
          let trimmed = this.trimTo(input[i], colsWidth);
          const trimmedLength = trimmed.length;
          const matches = inspect(trimmed).match(ESCAPE_CODE_PATTERN);
          let color = '';

          // Ugh. We're chopping a line, so we have to look for unfinished
          // color assignments and throw them on the next line.
          if (matches && matches[matches.length - 1] !== '\\u001B[39m') {
            trimmed += '\u001B[39m';

            // eslint-disable-next-line no-magic-numbers, unicorn/no-hex-escape
            color = `\x1B[m${String(matches[matches.length - 1]).slice(7, 9)}`;
          }

          input[i] = color + input[i].slice(trimmedLength, input[i].length).trim();
          line += pad(trimmed.trim(), chosenWidth);

          if (this.stripEscapeCode(input[i]).trim() !== '') {
            done = false;
          }
        }
      }

      lines.push(line);

      if (!done) {
        appendLine();
      }
    };

    appendLine();

    lines.forEach((line) => {
      this.log(line);
    });

    return this;
  }

  log(...args: *[]): this {
    this.logger(...args);

    return this;
  }

  trimTo(message: string, amount: number): string {
    const visual = this.stripEscapeCode(message).slice(0, amount);
    let raw = '';
    let result = '';

    for (let i = 0; i < message.length; i += 1) {
      raw += message[i];

      if (this.stripEscapeCode(raw) === visual) {
        result = raw;
        break;
      }
    }

    if (result.length < (amount - BUFFER_WIDTH)) {
      return result;
    }

    let newResult = result;
    let found = false;

    for (let j = result.length; j > 0; j -= 1) {
      if (result[j] === ' ') {
        found = true;
        break;
      } else {
        newResult = newResult.slice(0, newResult.length - 1);
      }
    }

    return found ? newResult : result;
  }

  stripEscapeCode(message: string): string {
    return message.replace(ESCAPE_CODE_PATTERN, '');
  }
}
