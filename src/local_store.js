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
    scope = scope || "";

    Store.call(this);
    var proto = util.prototype(this);

    function clear(prefix) {
      var keys = [];
      var idx = 0;
      var key;
      while(key = localStorage.key(idx++)) {
        //console.log("Is prefix?", scope, key, key.indexOf(scope));
        if (key.indexOf(prefix) === 0) {
          keys.push(key);
        }
      }
      _.each(keys, function(key) {
//        console.log("Clearing", key);
        localStorage.removeItem(key);
      })
    }

    proto.__hash__ = function(type, id) {
      path = id ? [scope, "document", id, type] : [scope, type]
      var key = path.join(":");
      return new LocalStore.Hash(key);
    }

    proto.__delete__ = function (id) {
      // TODO: maybe could improve, as the actual structure is not defined here
      clear(scope+":document:"+id);
    }

    proto.__clear__ = function() {
      clear(scope);
    }
  };

  LocalStore.Hash = function(scope) {

    var proto = util.prototype(this);
    Store.AbstractHash.call(this);

    var self = this;

    this.scoped = function(key) {
      return scope+":"+key;
    }

    proto.contains = function(key) {
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

  // only add this when localStorage is available
  if (root.localStorage) {
    root.Substance.LocalStore = LocalStore;
  }

})(this);
