
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

var MemoryStore = function() {
  Store.call(this);
  this.content = {};

  this.impl = new MemoryStore.__impl__(this);
}

MemoryStore.__impl__ = function(self) {

  this.hash = function() {
    return this.sortedhash.apply(this, arguments);
  };

  this.sortedhash = function() {
    var path = arguments;
    var obj = self.content;
    _.each(path, function(scope) {
      obj[scope] = obj[scope] || {};
      obj = obj[scope];
    });
    return new MemoryStore.Hash(obj);
  };

  this.delete = function (id) {
    delete self.content.document[id];
  };

  this.clear = function() {
    self.content = {};
  };

};

MemoryStore.prototype = Store.prototype;

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
    if (value === undefined) delete this.obj[key];
    else {
      // TODO: is there a quicker cloning mehtod?
      this.obj[key] = JSON.parse(JSON.stringify(value));
    }
  }

});

// Exports
if (typeof exports !== 'undefined') {
  exports.MemoryStore = MemoryStore;
} else {
  root.Substance.MemoryStore = MemoryStore;
}

})(this);
