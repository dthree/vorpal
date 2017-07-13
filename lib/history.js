// @flow

import os from 'os';
import path from 'path';
import { JSONStorage } from 'node-localstorage';

import type { InputCommand } from './types';

// Number of command histories kept in persistent storage
const HISTORY_SIZE: number = 500;
const DEFAULT_STORAGE_PATH: string = path.normalize(path.join(os.tmpdir(), '.local_storage'));

export default class History {
  _counter: number;
  _counterCache: number;
  _history: InputCommand[];
  _historyCache: InputCommand[];
  _inMode: boolean;
  _localStorage: JSONStorage;
  _storageKey: string;

  constructor() {
    this._inMode = false;
    this._storageKey = '';

    // Counter moves based on number of times 'up' or 'down'
    // was pressed in traversing command history.
    this._history = [];
    this._counter = 0;

    // When in a 'mode', we reset the history and store it in a cache until
    // exiting the 'mode', at which point we resume the original history.
    this._historyCache = [];
    this._counterCache = 0;
  }

  /**
   * Set a unique ID for this history instance.
   */
  setKey(key: string): this {
    // Initialize an instance with the default path if it is not initialized
    if (!this._localStorage) {
      this._localStorage = new JSONStorage(DEFAULT_STORAGE_PATH);
    }

    this._storageKey = `command_history_${key}`;

    // Pull in history from local storage
    let persistedHistory = [];

    try {
      persistedHistory = this._localStorage.getItem(this._storageKey);
    } catch (error) {
      // Nothing to do if the history cannot be parsed,
      // so just load an empty one, which is better than crashing.
    }

    if (Array.isArray(persistedHistory)) {
      this._history.push(...persistedHistory);
    }

    return this;
  }

  /**
   * Initialize a local storage instance with the path if not already initialized.
   */
  setStoragePath(newPath: string): this {
    if (!this._localStorage) {
      this._localStorage = new JSONStorage(newPath);
    }

    return this;
  }

  /**
   * Get previous history. Called when up is pressed.
   */
  getPreviousHistory(): InputCommand {
    this._counter += 1;
    this._counter = (this._counter > this._history.length)
      ? this._history.length
      : this._counter;

    return this._history[this._history.length - this._counter];
  }

  /**
   * Get next history. Called when down is pressed.
   */
  getNextHistory(): InputCommand {
    this._counter -= 1;

    // Return empty prompt if the we dont have any history to show
    if (this._counter < 1) {
      this._counter = 0;

      return '';
    }

    return this._history[this._history.length - this._counter];
  }

  /**
   * Peek into history, without changing state.
   */
  peek(depth: number = 0): InputCommand {
    return this._history[this._history.length - 1 - depth];
  }

  /**
   * A new command was submitted. Called when enter is pressed and the prompt is not empty.
   */
  newCommand(input: InputCommand): this {
    // Always reset history when new command is executed
    this._counter = 0;

    // Don't store command in history if it's a duplicate
    if (this._history[this._history.length - 1] === input) {
      return this;
    }

    // Push into history
    this._history.push(input);

    // Only persist history when not in mode
    if (this._storageKey && !this._inMode) {
      const { length } = this._history;
      let persistedHistory = this._history;

      if (length > HISTORY_SIZE) {
        persistedHistory = this._history.slice(length - HISTORY_SIZE - 1, length - 1);
      }

      // Add to local storage
      this._localStorage.setItem(this._storageKey, persistedHistory);
    }

    return this;
  }

  /**
   * Called when entering a mode.
   */
  enterMode(): this {
    // Reassign the command history to a cache,
    // replacing it with a blank history for the mode.
    this._historyCache = [...this._history];
    this._counterCache = this._counter;
    this._history = [];
    this._counter = 0;
    this._inMode = true;

    return this;
  }

  /**
   * Called when exiting a mode.
   */
  exitMode(): this {
    this._history = [...this._historyCache];
    this._counter = this._counterCache;
    this._historyCache = [];
    this._counterCache = 0;
    this._inMode = false;

    return this;
  }

  /**
   * Clears the command history (currently only used in unit test).
   */
  clear(): this {
    if (this._storageKey) {
      this._localStorage.removeItem(this._storageKey);
    }

    return this;
  }
}
