'use strict';

var LocalStorageO = require('node-localstorage').LocalStorage;
var path = require('path');
var DEFAULT_STORAGE_PATH = path.join(__dirname, '/.local_storage_');

var LocalStorage = {
  setId: function setId(id) {
    if (id === undefined) {
      throw new Error('vorpal.localStorage() requires a unique key to be passed in.');
    }
    if (!this._localStorage) {
      this._localStorage = new LocalStorageO(DEFAULT_STORAGE_PATH + id);
    }
  },
  validate: function validate() {
    if (this._localStorage === undefined) {
      throw new Error('Vorpal.localStorage() was not initialized before writing data.');
    }
  },
  getItem: function getItem(key, value) {
    this.validate();
    return this._localStorage.getItem(key, value);
  },
  setItem: function setItem(key, value) {
    this.validate();
    return this._localStorage.setItem(key, value);
  },
  removeItem: function removeItem(key) {
    this.validate();
    return this._localStorage.removeItem(key);
  }
};

module.exports = LocalStorage;