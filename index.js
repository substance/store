"use strict";

var Store = require('./src/store');
Store.LocalStore = require('./src/local_store');
Store.MemoryStore = require('./src/memory_store');

module.exports = Store;
