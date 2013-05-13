(function(ctx){

  // Substance.RemoteStore Interface
  // -------

  var RemoteStore = function(options) {
    var that = this;
    this.client = options.client;

    // Create a new document
    // -------

    this.create = function(id, options, cb) {
      this.client.createDocument(id, options, cb);
    };

    // Get document by id
    // -------

    this.getInfo = function(id, cb) {
      this.client.getDocumentInfo(id, cb);
    };

    this.get = function(id, cb) {
      this.client.getDocument(id, cb);
    };

    // List all allowed documents complete with metadata
    // -------

    // TODO: Currently the hub returns a hash for documents, should be a list!
    this.list = function (cb) {
      this.client.listDocuments(cb);
    };

    // Permanently deletes a document
    // -------

    this.delete = function (id, cb) {
      this.client.deleteDocument(id, cb);
    };

    // Checks if a document exists
    // -------

    this.exists = function (id, cb) {
      this.client.listDocuments(function(err, docs) {
        if (err) cb(err);
        cb(null, (id in docs));
      });
    };

    // Retrieves a range of the document's commits
    // -------

    this.commits = function(id, last, since, cb) {
      this.client.documentCommits(id, last, since, cb);
    };

    // Stores a sequence of commits for a given document id.
    // -------

    // TODO: update original API so they also take meta and refs
    this.update = function(id, options, cb) {
      this.client.updateDocument(id, options, cb);
    };

    this.getRefs = function(id, branch, cb) {
      that.client.getDocumentInfo(id, function(err, doc) {
        if (err) return cb(err);
        cb(null, doc.refs[branch]);
      });
    }

    this.createBlob = function(docId, blobId, data, cb) {
      return this.client.createBlob(docId, blobId, data, cb);
    }

    this.getBlob = function(docId, blobId, data, cb) {
      return this.client.getBlob(docId, blobId, data, cb);
    }

    this.deleteBlob = function(docId, blobId, cb) {
      return this.client.deleteBlob(docId, blobId, cb);
    }

    this.listBlobs = function(docId, cb) {
      return this.client.listBlobs(docId, cb);
    }

  };


  // Exports
  if (typeof exports !== 'undefined') {
    exports.RemoteStore = RemoteStore;
  } else {
    if (!ctx.Substance) ctx.Substance = {};
    ctx.Substance.RemoteStore = RemoteStore;
  }
})(this);
