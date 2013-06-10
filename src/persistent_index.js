(function(root) { "use_strict";

/*jshint unused: false*/ // deactivating this, as we define abstract interfaces here

var _,
    util,
    errors,
    Store,
    Chronicle;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('../../util/util');
  errors = require('../../util/errors');
  Store = require('./store').Store;
  Chronicle = require('../../chronicle/chronicle');
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
  Chronicle = root.Substance.Chronicle;
}

var CHANGES = "changes";
var REFS = "refs";

var PersistentIndex = function(store, index) {
  this.index = index || Chronicle.Index.create();

  this.store = store;
  this.changes = store.hash(CHANGES);
  this.refs = store.hash(REFS);

  // Initialize the index with the content loaded from the store

  // Trick: let the changes hash mimic an Index (duck-type)
  // and use Index.import
  this.changes.list = this.changes.keys;
  this.index.import(this.changes);

  _.each(this.refs.keys(), function(ref) {
    this.index.setRef(ref, this.refs.get(ref));
  }, this);
};

PersistentIndex.__prototype__ = function() {

  // Overrides
  // ========

  this.add = function(change) {
    this.index.add(change);
    this.changes.set(change.id, change);
  };

  this.remove = function(id) {
    this.index.remove(id);
    this.changes.delete(id);
  };

  this.setRef = function(name, id) {
    this.index.setRef(name, id);
    this.refs.set(name, id);
  };

  // Not allowed.
  this.reconnect = function(child, parent) {
    throw new errors.SubstanceError("Persistent changes can not be changed.");
  };

  // Delegates
  // ========

  this.contains = function(changeId) {
    return this.index.contains(changeId);
  };

  this.path = function(start, end) {
    return this.index.path(start, end);
  };

  this.get = function(id) {
    return this.index.get(id);
  };

  this.getChildren = function(id) {
    return this.index.getChildren(id);
  };

  this.list = function() {
    return this.index.list();
  };

  this.diff = function(start, end) {
    return this.index.diff(start, end);
  };

  this.getRef = function(name) {
    return this.index.getRef(name);
  };

};
PersistentIndex.__prototype__.prototype = Chronicle.Index.prototype;
PersistentIndex.prototype = new PersistentIndex.__prototype__();

})(this);
