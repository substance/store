(function(root) { "use_strict";

var _,
    util,
    errors,
    ot,
    Store,
    Data;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('../lib/util/util');
  errors = require('../lib/util/errors');
  Store = require('./store').Store;
  Data = require('../lib/data/data');
  ot = require('./lib/chronicle/lib/ot/index');
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
  Data = root.Substance.Data;
  ot = root.Substance.Chronicle.ot;
}

var PersistentGraph = function(store, graph) {
  this.graph = graph;
  this.__nodes__ = store.hash("nodes");
  // HACK: objectAdapter is not part of the official interface,
  //  so this can be considered as a provisional HACK
  // TODO: find a proper way...
  this.objectAdapter = new PersistentGraph.ObjectAdapter(graph.objectAdapter, this.__nodes__);

  // import persistet nodes
  var keys = this.__nodes__.keys();
  for (var idx = 0; idx < keys.length; idx++) {
    graph.create(this.__nodes__.get(keys[idx]));
  }
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

  this.reset = function() {
    this.graph.reset();
    if (this.__nodes__) this.__nodes__.clear();
  };

  this.create = function() {
    this.graph.create.apply(this, arguments);
  };

  this.update = function() {
    this.graph.update.apply(this, arguments);
  };

  this.delete = function() {
    this.graph.delete.apply(this, arguments);
  };

  this.set = function() {
    this.graph.set.apply(this, arguments);
  };

  this.exec = function(op) {
    return __super__.exec.call(this, op);
  };

};
PersistentGraph.__prototype__.prototype = Data.Graph.prototype;
PersistentGraph.prototype = new PersistentGraph.__prototype__();

// ObjectOperation Adapter
// ========
//
// This adapter delegates object changes as supported by ot.ObjectOperation
// to graph methods

PersistentGraph.ObjectAdapter = function(delegate, nodes) {
  this.delegate = delegate;
  this.nodes = nodes;
};

PersistentGraph.ObjectAdapter.__prototype__ = function() {

  this.get = function(path) {
    return this.delegate.get(path);
  };

  this.create = function(__, value) {
    this.delegate.create(__, value);
    this.nodes.set(value.id, value);
  };

  this.set = function(path, value) {
    this.delegate.set(path, value);
    // TODO: is it ok to store the value as node???
    var nodeId = path[0];
    var updated = this.delegate.get([nodeId]);
    this.nodes.set(nodeId, updated);
  };

  this.delete = function(__, value) {
    this.delegate.delete(__, value);
    this.nodes.delete(value.id);
  };
};
PersistentGraph.ObjectAdapter.__prototype__.prototype = ot.ObjectOperation.Object.prototype;
PersistentGraph.ObjectAdapter.prototype = new PersistentGraph.ObjectAdapter.__prototype__();


if (typeof exports !== 'undefined') {
  module.exports = PersistentGraph;
} else {
  root.Substance.Data.PersistentGraph = PersistentGraph;
}

})(this);
