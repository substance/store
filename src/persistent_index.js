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
  this.__changes__ = store.hash(CHANGES);
  this.__refs__ = store.hash(REFS);

  // Initialize the index with the content loaded from the store

  // Trick: let the changes hash mimic an Index (duck-type)
  // and use Index.import
  this.__changes__.list = this.__changes__.keys;
  this.index.import(this.__changes__);

  _.each(this.__refs__.keys(), function(ref) {
    this.index.setRef(ref, this.__refs__.get(ref));
  }, this);
};

PersistentIndex.__prototype__ = function() {

  // Overrides
  // ========

  this.add = function(change) {
    this.index.add(change);
    this.__changes__.set(change.id, change);
  };

  this.remove = function(id) {
    this.index.remove(id);
    this.__changes__.delete(id);
  };

  this.setRef = function(name, id) {
    this.index.setRef(name, id);
    this.__refs__.set(name, id);
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

  this.listRefs = function() {
    return this.index.listRefs();
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

if (typeof exports !== 'undefined') {
  module.exports = PersistentIndex;
} else {
  Chronicle.PersistentIndex = PersistentIndex;
}

})(this);
