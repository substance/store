(function(){

var root = this;

// Native extension
if (typeof exports !== 'undefined') {
  var util = require('../../util/util');
  var errors = require('../../util/errors');
  var Store = require('./store').Store;
  var _ = require('underscore');
} else {
  var util = root.Substance.util;
  var errors = root.Substance.errors;
  var Store = root.Substance.Store;
  var _ = root._;
}

var LocalStore = function(scope) {
  Store.call(this);
  this.scope = scope || "";

  this.impl = new LocalStore.__impl__(this);
};

LocalStore.__impl__ = function(self) {

  function clear(prefix) {
    var keys = [];
    var idx = 0;
    var key;
    while(key=localStorage.key(idx++)) {
      //console.log("Is prefix?", scope, key, key.indexOf(scope));
      if (key.indexOf(prefix) === 0) {
        keys.push(key);
      }
    }
    _.each(keys, function(key) {
      localStorage.removeItem(key);
    })
  }

  this.hash = function() {
    var key = Store.defaultHashKey(arguments, self.scope);
    return new LocalStore.Hash(key);
  },

  this.delete = function (id) {
    // TODO: maybe could improve, as the actual structure is not defined here
    clear(self.scope+":document:"+id);
  },

  this.clear = function() {
    clear(self.scope);
  }

  this.log = function(id) {
    var changes = self.getChanges(id);
    var result = [];
    _.each(changes, function(c){
      console.log(JSON.stringify(c));
    });
  }
};

LocalStore.prototype = Store.prototype;

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
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  }

});

// only add this when localStorage is available
if (root.localStorage) {
  root.Substance.LocalStore = LocalStore;
}

})(this);
