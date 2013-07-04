(function(root){ "use_strict";

var _,
    util,
    errors,
    Store;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('substance-util');
  errors = require('substance-util/errors');
  Store = require('./store');
} else {
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
  _ = root._;
}

var AsyncStore = function(store) {
  this.store = store;
};

AsyncStore.__prototype__ = function() {

};

AsyncStore.prototype = new AsyncStore.__prototype__();

// Exports
if (typeof exports !== 'undefined') {
  module.exports = AsyncStore;
} else {
  root.Substance.AsyncStore = AsyncStore;
}

})(this);
