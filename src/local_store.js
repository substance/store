"use strict";

// Import
// ========

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;
var Store = require('./store');


// Module
// ========

var LocalStore = function(scope) {
  Store.call(this);
  this.scope = scope || "";
};

LocalStore.Prototype = function() {

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

LocalStore.Prototype.prototype = Store.prototype;
LocalStore.prototype = new LocalStore.Prototype();

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

// Export
// ========

module.exports = LocalStore;
