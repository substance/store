
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

    var documents = {};
    var commits = {};
    var blobs = {};
    var deletedDocuments = {}

    proto.__list__ = function () {
      return Object.keys(documents);
    }

    proto.__init__ = function (id) {
      documents[id] = {
        meta: {},
        refs: {}
      };
      commits[id] = {};
      blobs[id] = {};
    }

    proto.__delete__ = function (id) {
      delete documents[id];
      delete commits[id];
      delete blobs[id];
    }

    proto.__deletedDocuments__ = function () {
      return new Store.Hash(deletedDocuments);
    }

    proto.__exists__ = function (id) {
      return !!documents[id];
    }

    proto.__meta__ = function (id) {
      return new Store.Hash(documents[id].meta);
    }

    proto.__refs__ = function (id, branch) {
      return new Store.Hash(documents[id].refs);
    }

    proto.__commits__ = function (id) {
      return new Store.Hash(commits[id]);
    }

    proto.__blobs__ = function(id) {
      return new Store.Hash(blobs[id]);
    }

    proto.__clear__ = function() {
      documents = {};
      deletedDocuments = {};
      commits = {};
      blobs = {};
    }
  };

  // Exports
  if (typeof exports !== 'undefined') {
    exports.MemoryStore = MemoryStore;
  } else {
    root.MemoryStore = MemoryStore;
    root.Substance.MemoryStore = MemoryStore;
  }

})(this);
