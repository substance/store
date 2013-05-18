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

  this.__impl__ = new LocalStore.__impl__(this);
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

  this.hash = function(type, id) {
    var path = id ? [self.scope, "document", id, type] : [self.scope, type]
    var key = path.join(":");
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
LocalStore.prototype = new Store.__prototype__();

LocalStore.Hash = function(scope) {
  this.scope = scope;
};
LocalStore.Hash.__prototype__ = function() {

  this.scoped = function(key) {
    return this.scope+":"+key;
  }

  this.contains = function(key) {
    key = this.scoped(key);
    return localStorage.hasOwnProperty(key);
  };

  this.__get__ = function(key) {
    key = this.scoped(key);
    return JSON.parse(localStorage.getItem(key));
  };

  this.__set__ = function(key, value) {
    key = this.scoped(key);
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  };
};
LocalStore.Hash.__prototype__.prototype = new Store.AbstractHash();
LocalStore.Hash.prototype = new LocalStore.Hash.__prototype__();

// only add this when localStorage is available
if (root.localStorage) {
  root.Substance.LocalStore = LocalStore;
}

})(this);
