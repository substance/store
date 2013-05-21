
(function(){

  var root = this;

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

  var AsyncStore = function(store) {
    this.store = store;
    this.blobs = this.__blobs__();
  };

  AsyncStore.__prototype__ = function() {

    this.__blobs__ = function() {
      return new AsyncStore.Blobs(this.store);
    }

    this.exists = function (id, cb) {
      var result = this.store.exists(id);
      cb(null, result);
    };

    this.create = function (id, options, cb) {
      if (arguments.length == 2 && _.isFunction(options)) {
        cb = options;
        options = null;
      }
      var result;
      try {
        result = this.store.create(id, options);
      } catch (err) {
        return cb(err);
      }
      cb(null, result);
    };

    // Get document info (no contents)
    // --------

    this.getInfo = function(id, cb) {
      var result = this.store.getInfo(id);
      if(!result) return cb(new errors.StoreError("Document does not exist."));
      cb(null, result);
    };

    this.list = function (cb) {
      var result = this.store.list();
      cb(null, result);
    };

    this.get = function(id, cb) {
      var result = this.store.get(id);
      if(!result) return cb(new errors.StoreError("Document does not exist."));
      cb(null, result);
    };

    this.commits = function(id, options, cb) {
      var result = this.store.commits(id, options);
      cb(null, result);
    };

    this.delete = function (id, cb) {
      this.store.delete(id);
      cb(null);
    };

    this.clear = function(cb) {
      this.store.clear();
      cb(null);
    };

    this.update = function(id, options, cb) {
      if (arguments.length == 2) {
        cb = options;
        options = null;
      }
      try {
        this.store.update(id, options);
      } catch (err) {
        return cb(err);
      }
      cb(null);
    }

    this.getRefs = function(id, branch, cb) {

      if (arguments.length == 2 && _.isFunction(branch)) {
        cb = branch;
        var refs = this.store.getRefs(id);
        return cb(null, refs);
      }

      var refs = store.getRefs(id, branch);
      cb(null, refs);
    };

    this.setRefs = function(id, branch, refs, cb) {
      this.store.setRefs(id, branch, refs);
      cb(null);
    };

    this.deletedDocuments = function(cb) {
      var result = this.store.deletedDocuments();
      cb(null, result);
    };

    this.confirmDeletion = function(id, cb) {
      this.store.confirmDeletion(id);
      cb(null);
    };

    this.seed = function(data, cb) {
      this.store.seed(data);
      cb(null);
    };

    this.dump = function(cb) {
      var result = this.store.dump();
      cb(null, result);
    };

    this.getChanges = function(id, start, since, cb) {
      if (arguments.length == 2) {
        cb = start;
        start = undefined; since = undefined;
      }
      var result = this.store.getChanges(id, start, since);
      cb(null, result);
    };

    this.getLastChange = function(trackId, cb) {
      var result = this.store.getLastChange(trackId);
      cb(null, result);
    };

    this.applyCommand = function(trackId, command, cb) {
      try {
        this.store.applyCommand(trackId, command);
        cb(null);
      } catch (err) {
        cb(err);
      }
    };

  };
  AsyncStore.prototype = new AsyncStore.__prototype__();

  AsyncStore.Blobs = function(store) {

    this.create = function(docId, blobId, base64data, cb) {
      var result;
      try {
        result = store.blobs.create(docId, blobId, base64data);
      } catch(err) {
        return cb(err);
      }
      cb(null, result);
    };

    this.get = function(docId, blobId, cb) {
      var result = store.blobs.get(docId, blobId);
      if (!result) return cb(new errors.StoreError("Blob not found."));
      cb(null, result);
    };

    this.exists = function (docId, blobId, cb) {
      var result = store.blobs.exists(docId, blobId);
      cb(null, result);
    };

    this.delete = function(docId, blobId, cb) {
      store.delete(docId, blobId);
      cb(null);
    };

    this.list = function(docId, cb) {
      var result = store.blobs.list(docId);
      cb(null, result);
    };

  };

  // Exports
  if (typeof exports !== 'undefined') {
    module.exports = AsyncStore;
  } else {
    root.Substance.AsyncStore = AsyncStore;
  }

})(this);
