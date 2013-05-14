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
    console.log("LocalStore: scope", scope);

    Store.call(this);
    var proto = util.prototype(this);

    function __key__(id) {
       return scope+":documents:"+id;
    };

    function __documents__() {
      return new LocalStore.Hash(scope+":documents");
    }

    proto.__list__ = function () {
      return __documents__().keys();
    }

    proto.__init__ = function (id) {
      __documents__().set(id, true);
    }

    proto.__delete__ = function (id) {
      __documents__().delete(id);
      this.__meta__(id).delete();
      this.__refs__(id).delete();
      this.__commits__(id).delete();
      this.__blobs__(id).delete();
    }

    proto.__deletedDocuments__ = function () {
      return new LocalStore.Hash(scope+":trashbin");
    }

    proto.__exists__ = function (id) {
      return __documents__().contains(id);
    }

    proto.__meta__ = function (id) {
      return new LocalStore.Hash(__key__(id)+":meta");
    }

    proto.__refs__ = function (id, branch) {
      return new LocalStore.Hash(__key__(id)+":refs");
    }

    proto.__commits__ = function (id) {
      return new LocalStore.Hash(__key__(id)+":commits");
    }

    proto.__blobs__ = function(id) {
      return new LocalStore.Hash(__key__(id)+":blobs");
    }

    proto.__clear__ = function() {
      var keys = [];
      var idx = 0;
      var key;
      while(key = localStorage.key(idx++)) {
        //console.log("Is prefix?", scope, key, key.indexOf(scope));
        if (key.indexOf(scope) === 0) {
          keys.push(key);
        }
      }
      _.each(keys, function(key) {
        console.log("Clearing", key);
        localStorage.removeItem(key);
      })
    }
  };

  LocalStore.Hash = function(scope) {

    var KEYS = scope+":__keys__";

    this.contains = function(key) {
      return localStorage.hasOwnProperty(scope+":"+key);
    };

    this.get = function(key) {
      if (arguments.length == 0) {
        var keys = this.keys();
        var result = {};
        var self = this;
        _.each(keys, function(key) {
          result[key] = self.get(key);
        });
        return result;
      }
      return JSON.parse(localStorage.getItem(scope+":"+key));
    };

    this.set = function(key, value) {
      localStorage.setItem(scope+":"+key, JSON.stringify(value));
      var keys = this.keys();
      if (keys.indexOf(key) < 0) keys.push(key);
      localStorage.setItem(KEYS, JSON.stringify(keys));
    };

    this.keys = function() {
      return JSON.parse(localStorage.getItem(KEYS));
    };

    this.delete = function(key) {
      if(arguments.length == 0) {
        var keys = this.keys();
        var self = this;
        _.each(keys, function(key) {
          self.delete(key);
        })
        localStorage.removeItem(KEYS);
        return;
      }

      localStorage.removeItem(scope+":"+key);
      var keys = _.without(this.keys(), key);
      localStorage.setItem(KEYS, JSON.stringify(keys));
    }

    var keys = this.keys();
    if (!keys) localStorage.setItem(KEYS, "[]");
  };

  // only add this when localStorage is available
  if (root.localStorage) {
    root.Substance.LocalStore = LocalStore;
  }

})(this);
