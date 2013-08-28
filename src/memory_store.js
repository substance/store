"use strict";

// Import
// ========

var _ = require('underscore');
var util = require('substance-util');
var errors = util.errors;
var Store = require('./store');

// Module
// ========

var MemoryStore = function(content) {
  Store.call(this);
  this.content = content || {};
};

MemoryStore.Prototype = function() {

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

MemoryStore.Prototype.prototype = Store.prototype;
MemoryStore.prototype = new MemoryStore.Prototype();

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

// Export
// ========

module.exports = MemoryStore;
