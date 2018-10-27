'use strict';

var LocalStorageO = require('node-localstorage').LocalStorage;
var path = require('path');
const os = require('os');
const temp = path.normalize(path.join(os.tmpdir(), '/.local_storage_'));
const DEFAULT_STORAGE_PATH = temp;

var LocalStorage = {

  setId(id) {
    if (id === undefined) {
      throw new Error('vorpal.localStorage() requires a unique key to be passed in.');
    }
    if (!this._localStorage) {
      this._localStorage = new LocalStorageO(DEFAULT_STORAGE_PATH + id);
    }
  },

  validate() {
    if (this._localStorage === undefined) {
      throw new Error('Vorpal.localStorage() was not initialized before writing data.');
    }
  },

  getItem(key, value) {
    this.validate();
    return this._localStorage.getItem(key, value);
  },

  setItem(key, value) {
    this.validate();
    return this._localStorage.setItem(key, value);
  },

  removeItem(key) {
    this.validate();
    return this._localStorage.removeItem(key);
  }
};

module.exports = LocalStorage;
