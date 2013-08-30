"use strict";

var LocalStore = require("../index").LocalStore;

var Test = require('substance-test');
var registerTest = Test.registerTest;
var StoreTest = require("./store_test");

var impl = {
  setup: function() {
    this.store = new LocalStore("test:localstore");
    this.store.clear();
  },
  actions: []
};

if (global.localStorage) {
  registerTest(["Substance.Store", "LocalStore"], new StoreTest(impl));
}
