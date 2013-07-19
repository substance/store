"use strict";

var store = require("..");
var test = require('substance-test');
var registerTest = test.Test.registerTest;
var StoreTest = require("./store_test");

var impl = {
  setup: function() {
    this.store = new store.MemoryStore();
  }
};

registerTest(["Store", "MemoryStore"], new StoreTest(impl));
