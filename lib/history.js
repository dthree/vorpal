'use strict';

var _ = require('lodash');
var LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage('./.cmd_history');

// Number of command histories kept in persistent storage
var HISTORY_SIZE = 50;

var History = function () {
  // Prompt Command History
  // Histctr moves based on number of times 'up' (+= ctr)
  //  or 'down' (-= ctr) was pressed in traversing
  // command history.
  this._hist = [];
  this._histCtr = 0;

  // When in a 'mode', we reset the
  // history and store it in a cache until
  // exiting the 'mode', at which point we
  // resume the original history.
  this._histCache = [];
  this._histCtrCache = 0;
};

/**
 * Initialize the history with local storage data
 * Called when session is initialized
 */
History.prototype.init = function () {
  // Load history from local storage
  // Read cmd_history_cache first in case we exited from a mode last time.
  var persistedHistory = JSON.parse(localStorage.getItem('cmd_history'));
  if (_.isArray(persistedHistory)) {
    Array.prototype.push.apply(this._hist, persistedHistory);
  }
};

/**
 * Get previous history. Called when up is pressed.
 * @return {String}
 */
History.prototype.getPreviousHistory = function () {
  this._histCtr++;
  this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
  return this._hist[this._hist.length - (this._histCtr)];
};

/**
 * Get next history. Called when down is pressed.
 * @return {String}
 */
History.prototype.getNextHistory = function () {
  this._histCtr--;

  // Return empty prompt if the we dont have any history to show
  if (this._histCtr < 1) {
    this._histCtr = 0;
    return '';
  }

  return this._hist[this._hist.length - (this._histCtr)];
};

/**
 * A new command was submitted. Called when enter is pressed and the prompt is not empty.
 * @param cmd
 */
History.prototype.newCommand = function (cmd) {
  this._hist.push(cmd);
  this._histCtr = 0;

  // Only persist history when not in mode
  if (!this._inMode) {
    var persistedHistory = this._hist;
    var historyLen = this._hist.length;
    if (historyLen > HISTORY_SIZE) {
      persistedHistory = this._hist.slice(historyLen - HISTORY_SIZE - 1, historyLen - 1);
    }

    // Add to local storage
    localStorage.setItem('cmd_history', JSON.stringify(persistedHistory));
  }
};

/**
 * Called when entering a mode
 */
History.prototype.enterMode = function () {
  // Reassign the command history to a
  // cache, replacing it with a blank
  // history for the mode.
  this._histCache = _.clone(this._hist);
  this._histCtrCache = parseFloat(this._histCtr);
  this._hist = [];
  this._histCtr = 0;
  this._inMode = true;
};

/**
 * Called when exiting a mode
 */
History.prototype.exitMode = function () {
  this._hist = this._histCache;
  this._histCtr = this._histCtrCache;
  this._histCache = [];
  this._histCtrCache = 0;
  this._inMode = false;
};

module.exports = History;
