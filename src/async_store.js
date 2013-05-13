
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

    var proto = util.prototype(this);
    var self = this;

    proto.exists = function (id, cb) {
      var result = store.exists(id);
      cb(null, result);
    };

    proto.create = function (id, options, cb) {
      if (arguments.length == 2 && _.isFunction(options)) {
        cb = options;
        options = null;
      }
      var result;
      try {
        result = store.create(id, options);
      } catch (err) {
        return cb(err);
      }
      cb(null, result);
    };

    // Get document info (no contents)
    // --------

    proto.getInfo = function(id, cb) {
      var result = store.getInfo();
      if(!result) return cb(new errors.StoreError("Document does not exist."));
      cb(null, result);
    };

    proto.list = function (cb) {
      var result = store.list();
      cb(null, result);
    };

    proto.get = function(id, cb) {
      var result = store.get(id);
      if(!result) return cb(new errors.StoreError("Document does not exist."));
      cb(null, result);
    };

    proto.commits = function(id, last, since, cb) {
      var result = store.commits(id, last, since);
      cb(null, result);
    };

    proto.delete = function (id, cb) {
      store.delete(id);
      cb(null);
    };

    proto.clear = function(cb) {
      store.clear();
      cb(null);
    };

    proto.update = function(id, options, cb) {
      if (arguments.length == 2) {
        cb = options;
        options = null;
      }
      try {
        store.update(id, options);
      } catch (err) {
        return cb(err);
      }
      cb(null);
    }

    proto.getRefs = function(id, branch, cb) {

      if (arguments.length == 2 && _.isFunction(branch)) {
        cb = branch;
        var refs = store.getRefs(id);
        return cb(null, refs);
      }

      var refs = store.getRefs(id, branch);
      cb(null, refs);
    };

    proto.setRefs = function(id, branch, refs, cb) {
      store.setRefs(id, branch, refs);
      cb(null);
    };

    proto.deletedDocuments = function(cb) {
      var result = store.deletedDocuments();
      cb(null, result);
    };

    proto.confirmDeletion = function(id, cb) {
      store.confirmDeletion(id);
      cb(null);
    };

    proto.seed = function(data, cb) {
      store.seed(data);
      cb(null);
    };

    proto.dump = function(cb) {
      var result = store.dump();
      cb(null, result);
    };

    proto.createBlob = function(docId, blobId, base64data, cb) {
      var result;
      try {
        result = store.createBlob(docId, blobId, base64data);
      } catch(err) {
        return cb(err);
      }
      cb(null, result);
    };

    proto.getBlob = function(docId, blobId, cb) {
      var result = store.getBlob(docId, blobId);
      if (!result) return cb(new errors.StoreError("Blob not found."));
      cb(null, result);
    };

    proto.blobExists = function (docId, blobId, cb) {
      var result = store.blobExists(docId, blobId);
      cb(null, result);
    };

    proto.deleteBlob = function(docId, blobId, cb) {
      store.deleteBlob(docId, blobId);
      cb(null);
    };

    proto.listBlobs = function(docId, cb) {
      var result = store.listBlobs(docId);
      cb(null, result);
    };

  };

  // Exports
  if (typeof exports !== 'undefined') {
    exports.AsyncStore = AsyncStore;
  } else {
    root.Substance.AsyncStore = AsyncStore;
  }

})(this);
