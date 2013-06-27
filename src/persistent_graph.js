(function(root) { "use_strict";

var _,
    util,
    errors,
    Store,
    Data;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('../lib/util/util');
  errors = require('../lib/util/errors');
  Store = require('./store').Store;
  Data = require('../lib/data/data');
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
  Data = root.Substance.Data;
}

var PersistentGraph = function(store, graph) {
  this.graph = graph;
  this.__nodes__ = store.hash("nodes");
};

PersistentGraph.__prototype__ = function() {

  var __super__ = util.prototype(this);

  // delegate all methods to graph
  _.each(Data.Graph.prototype, function(f, name) {
    if (_.isFunction(f)) {
      this[name] = function() {
        return this.graph[name].apply(this.graph, arguments);
      };
    }
  }, this);

  // Overrides
  // --------

  this.get = function(path) {
    if (_.isString(path)) return this.__nodes__.get(path);
    else return __super__.get.call(this, path);
  };

  this.delete = function(id) {
    this.graph.delete(id);
    this.store.delete(id);
  };

  this.reset = function() {
    this.graph.reset();
    if (this.store) this.store.clear();
  };

};
PersistentGraph.__prototype__.prototype = Data.Graph.prototype;
PersistentGraph.prototype = new PersistentGraph.__prototype__();

if (typeof exports !== 'undefined') {
  module.exports = PersistentGraph;
} else {
  root.Substance.Data.PersistentGraph = PersistentGraph;
}

})(this);
