"use strict";

var Store = require("../index");
var Test = require('substance-test');
var registerTest = Test.registerTest;
var StoreTest = require("./store_test");

var impl = {
  setup: function() {
    this.store = new Store.MemoryStore();
  }
};

registerTest(["Substance.Store", "MemoryStore"], new StoreTest(impl));
