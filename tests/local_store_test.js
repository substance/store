"use strict";

var LocalStore = require("..").LocalStore;

var test = require('substance-test');
var registerTest = test.Test.registerTest;
var StoreTest = require("./store_test");

var impl = {
  setup: function() {
    this.store = new LocalStore("test:localstore");
    this.store.clear();
  },
  actions: []
};

if (global.localStorage) {
  registerTest(["Store", "LocalStore"], new StoreTest(impl));
}
