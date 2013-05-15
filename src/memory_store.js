
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
    var proto = util.prototype(this);

    this.content = {};

    proto.__hash__ = function(type, id) {
      path = id ? ["document", id, type] : [type]
      var obj = this.content;
      _.each(path, function(scope) {
        obj[scope] = obj[scope] || {};
        obj = obj[scope];
      });
      return new MemoryStore.Hash(obj);
    }

    proto.__delete__ = function (id) {
      // TODO: maybe could improve, as the actual structure is not defined here
      delete this.content.document.id;
    }

    proto.__clear__ = function() {
      this.content = {};
    }
  };

  MemoryStore.Hash = function(obj) {
    if (!obj) throw new Error("Illegal argument.");

    this.obj = obj;

    var proto = util.prototype(this);
    Store.AbstractHash.call(proto);

    proto.contains = function(key) {
      return !!this.obj[key];
    }

    proto.__get__ = function(key) {
      return this.obj[key];
    };

    proto.__set__ = function(key, value) {
      if (value === undefined) delete this.obj[key];
      else this.obj[key] = value;
    }
  }

  // Exports
  if (typeof exports !== 'undefined') {
    exports.MemoryStore = MemoryStore;
  } else {
    root.Substance.MemoryStore = MemoryStore;
  }

})(this);
