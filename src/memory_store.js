
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

var MemoryStore = function(content) {
  Store.call(this);
  this.content = content || {};
};

MemoryStore.__prototype__ = function() {

  function resolve(obj, path) {
    _.each(path, function(scope) {
      obj[scope] = obj[scope] || {};
      obj = obj[scope];
    });
    return obj;
  }

  this.hash = function() {
    return this.sortedhash.apply(this, arguments);
  };

  this.sortedhash = function() {
    var obj = resolve(this.content, arguments);
    return new MemoryStore.Hash(obj);
  };

  this.clear = function() {
    this.content = {};
  };

  this.subStore = function(path) {
    var obj = resolve(this.content, path);
    return new MemoryStore(obj);
  };

};

MemoryStore.__prototype__.prototype = Store.prototype;
MemoryStore.prototype = new MemoryStore.__prototype__();

MemoryStore.Hash = function(obj) {
  if (!obj) throw new Error("Illegal argument.");
  this.obj = obj;
};

MemoryStore.Hash.prototype = _.extend(new Store.AbstractHash(), {

  contains : function(key) {
    return !!this.obj[key];
  },

  __get__ : function(key) {
    return this.obj[key];
  },

  __set__ : function(key, value) {
    this.obj[key] = util.deepclone(value);
  },

  __delete__ : function(key) {
    delete this.obj[key];
  }

});

// Exports
if (typeof exports !== 'undefined') {
  module.exports = MemoryStore;
} else {
  root.Substance.MemoryStore = MemoryStore;
}

})(this);
