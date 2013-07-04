(function(root){ "use_strict";

var _,
    util,
    errors,
    Store;

// Native extension
if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('substance-util');
  errors = require('substance-util/errors');
  Store = require('./store');
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
}

var LocalStore = function(scope) {
  Store.call(this);
  this.scope = scope || "";
};

LocalStore.__prototype__ = function() {

  function clear(prefix) {
    var keys = [];
    var idx = 0;
    var key;
    while(true) {
      key = localStorage.key(idx++);
      if (!key) break;

      //console.log("Is prefix?", scope, key, key.indexOf(scope));
      if (key.indexOf(prefix) === 0) {
        keys.push(key);
      }
    }

    _.each(keys, function(key) {
      localStorage.removeItem(key);
    });
  }

  this.hash = function() {
    return this.sortedhash.apply(this, arguments);
  };

  this.sortedhash = function() {
    var key = Store.defaultHashKey(arguments, this.scope);
    return new LocalStore.Hash(key);
  };

  this.clear = function() {
    clear(this.scope);
  };

  this.subStore = function(path) {
    return new LocalStore(this.scope + ":" + path.join(":"));
  };

};

LocalStore.__prototype__.prototype = Store.prototype;
LocalStore.prototype = new LocalStore.__prototype__();

LocalStore.Hash = function(scope) {
  this.scope = scope;
};

LocalStore.Hash.prototype = _.extend(new Store.AbstractHash(), {

  scoped : function(key) {
    return this.scope+":"+key;
  },

  contains : function(key) {
    key = this.scoped(key);
    return localStorage.hasOwnProperty(key);
  },

  __get__ : function(key) {
    key = this.scoped(key);
    return JSON.parse(localStorage.getItem(key));
  },

  __set__ : function(key, value) {
    key = this.scoped(key);
    localStorage.setItem(key, JSON.stringify(value));
  },

  __delete__ : function(key) {
    key = this.scoped(key);
    localStorage.removeItem(key);
  }

});

// only add this when localStorage is available
if (root.localStorage) {
  root.Substance.LocalStore = LocalStore;
}

})(this);
