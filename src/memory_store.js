
(function(root){ "use_strict";

var _,
    util,
    errors,
    Store;

// Native extension
if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('../../util/util');
  errors = require('../../util/errors');
  Store = require('./store').Store;
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
}

var MemoryStore = function() {
  Store.call(this);
  this.content = {};
};

MemoryStore.__prototype__ = function() {

  this.hash = function() {
    return this.sortedhash.apply(this, arguments);
  };

  this.sortedhash = function() {
    var path = arguments;
    var obj = this.content;
    _.each(path, function(scope) {
      obj[scope] = obj[scope] || {};
      obj = obj[scope];
    });
    return new MemoryStore.Hash(obj);
  };

  this.delete = function (id) {
    delete this.content.document[id];
  };

  this.clear = function() {
    this.content = {};
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
  exports.MemoryStore = MemoryStore;
} else {
  root.Substance.MemoryStore = MemoryStore;
}

})(this);
