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
  Data.Graph.call(this);
  this.__nodes__ = store.hash("nodes");
  if(graph) this.merge(graph);
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

    var prop = this.resolve(path);
    return prop.get();
  };

  this.delete = function(id) {
    this.removeFromIndex(this.get(id));
    this.store.delete(id);
  };

  this.resolve = function(path) {
    return new PersistentGraph.Property(this, path);
  };

  this.reset = function() {
    __super__.reset.call(this);
    if (this.store) this.store.clear();
  };

};
PersistentGraph.__prototype__.prototype = Data.Graph.prototype;
PersistentGraph.prototype = new PersistentGraph.__prototype__();


PersistentGraph.Property = function(graph, path, nodes) {
  Data.Property.call(this, graph, path);
  this.graph = graph;
};

PersistentGraph.Property.__prototype__ = function() {
  var __super__ = util.prototype(this);

  this.set = function(value) {
    __super__.set.call(this, value);
    this.graph.set(this.node.id, this.node);
  };

};
PersistentGraph.Property.__prototype__.prototype = Data.Property.prototype;
PersistentGraph.Property.prototype = new PersistentGraph.Property.__prototype__();

if (typeof exports !== 'undefined') {
  module.exports = PersistentGraph;
} else {
  Substance.Data.PersistentGraph = PersistentGraph;
}

})(this);
