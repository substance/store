(function(root){ "use_strict";

var _,
    util,
    errors;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('../../util/util');
  errors = require('../../util/errors');
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
}

var StoreError = errors.define('StoreError', -1);

var Store = function() {};

// Store: Public Interface
// ========
//

Store.__prototype__ = function() {

  // as this is abstract disable warnings about unused variables*/
  /*jshint unused:false*/

  // Returns a key value store for the given path.
  // --------
  //

  this.hash = function(path) {
    return this.sortedhash(path);
  };

  this.sortedhash = function(path) {
    throw "Called abstract method.";
  };

  // Clears the whole store
  // --------
  //
  this.clear = function() {
    throw "Called abstract method.";
  };

  // Create a store instance that is phyisically living in a sub-scope of
  // this store
  this.subStore = function(path) {
    throw "Called abstract method.";
  };

};

Store.prototype = new Store.__prototype__();

// A helper class to adapt a javascript object to a unified hash interface
// used by the store.
// --------
// Note: the hash keeps the keys in order of changes. I.e., the last changed key will be last of keys()
//

Store.AbstractHash = function() {

  // as this is abstract disable warnings about unused variables*/
  /*jshint unused:false*/

  this.contains = function(key) {
    var keys = this.keys();
    if (!keys) return false;
    else return keys.indexOf(key) >= 0;
  };

  this.keys = function() {
    var keys = this.__get__("__keys__");
    if (!keys) {
      this.__set__("__keys__", []);
      keys = [];
    }
    return keys;
  };

  this.get = function(key) {
    if(!this.contains(key)) {
      //throw new StoreError("Unknown key:"+key);
      return undefined;
    }
    return this.__get__(key);
  };

  this.set = function(key, value) {
    if (!key) {
      throw new StoreError("Illegal key:"+key);
    }
    var keys = _.without(this.keys(), key);
    keys.push(key);
    this.__set__("__keys__", keys);
    this.__set__(key, value);
  };

  this.delete = function(key) {
    var keys = _.without(this.keys(), key);
    this.__set__("__keys__", keys);
    this.__delete__(key);
  };

  this.clear = function() {
    var keys = this.keys();
    _.each(keys, function(key) {
      this.__delete__(key);
    }, this);
    this.__set__("__keys__", []);
  };

  this.dump = function() {
    var keys = this.keys();
    var result = {};
    _.each(keys, function(key) {
      result[key] = this.__get__(key);
    }, this);
    return result;
  };

  // Trivial getter
  // --------
  // gets called by this.get()

  this.__get__ = function(key) {
    throw new Error("Not implemented");
  };

  // Trivial setter
  // --------
  // gets called by this.set()

  this.__set__ = function(key, value) {
    throw new Error("Not implemented");
  };

  this.__delete__ = function(key) {
    throw new Error("Not implemented");
  };

};

Store.defaultHashKey = function(args, scope) {
  var path = [];
  if (scope) path.push(scope);
  for (var idx=0; idx<args.length; idx++) {
    path.push(args[idx]);
  }
  return path.join(":");
};

// Exports
if (typeof exports !== 'undefined') {
  exports.Store = Store;
} else {
  root.Substance.Store = Store;
}

})(this);
