
(function(){

  var root = this;

  if (typeof exports !== 'undefined') {
    var util = require('../../util/util');
    var errors = require('../../util/errors');
    var _ = require('underscore');
  } else {
    var util = root.Substance.util;
    var errors = root.Substance.errors;
    var _ = root._;
  }

  errors.define('StoreError', -1);

  var Store = function() {

    var proto = util.prototype(this);
    var self = this;

    // Retrieves a chain of commits from the given list list of commits
    function getCommitChain(commit, commits) {
      var result = [commit];
      // edge cases: commit.parent == null
      if (commit.parent == null) return result;
      while(true) {
        // break if no parent is set or the parent sha is not in the given set of commits
        if (!commit.parent || !commits[commit.parent]) {
          break;
        }
        commit = commits[commit.parent]
        result.unshift(commit);
      }

      return result;
    }

    function commitsAsHash(commits) {
      if (_.isArray(commits)) {
        // convert the sequence of commits into an
        var tmp = {};
        _.each(commits, function(commit) {
          if (!commit || !commit.sha) console.log("Illegal commit". commit," in ", commits);
          else tmp[commit.sha] = commit;
        });
        commits = tmp;
      }
      return commits;
    }

    function updateCommits(id, newCommits) {
      if (!newCommits || newCommits.length == 0) return true;

      var commits = self.__commits__(id);
      newCommits = commitsAsHash(newCommits);

      var pending = {};

      _.each(newCommits, function(commit) {
        if (!commits.contains(commit.sha)) {
          var chain = getCommitChain(commit, newCommits);
          var parentSha = chain[0].parent;
          // if a parent is given, it must be an existing commits or
          // in the set of pending commits
          if(parentSha && !commits.contains(parentSha) && !pending[parentSha]) {
            // The chain can not be applied, as the parent commit is invalid.
            // Expecting null or an existing commit.
            throw new errors.StoreError("Invalid commit chain"+chain.toString());
          } else {
            _.each(chain, function(commit) {
              pending[commit.sha] = commit;
            })
          }
        }
      });

      // after all commits went through the check
      _.each(pending, function(commit, sha) {
        commits.set(sha, commit);
      });

      return true;
    };

    function updateMeta(id, meta) {
      if (!meta || meta.length == 0) return true;
      var _meta = self.__meta__(id);
      _.each(meta, function(val, key) {
        _meta.set(key, val);
      })
      return true;
    };

    function updateRefs(id, branch, refs) {
      // if no branch is given, it is assumed that
      // branch contains refs by branch.
      if (arguments.length == 2 || !branch) {
        var branches = branch;
        branch = null;
        _.each(branches, function(refs, branch) {
          updateRefs(id, branch, refs);
        });
        return true;
      }

      if (!refs || refs.length == 0) return true;

      var _refs = self.__refs__(id);
      var newRefs = _refs.get(branch) || {};
      _.extend(newRefs, refs);
      _refs.set(branch, newRefs);

      return true;
    };

    function importDump(data) {

      _.each(data['documents'], function(doc, id) {

        if (self.exists(id)) {
          self.delete(id);
          self.confirmDeletion(id);
        }

        self.create(id)

        // console.log('LE COMMITS MISSIEU', commits);
        var options = {
          meta: doc.meta,
          refs: doc.refs
        };
        updateCommits(id, doc.commits);
        self.update(id, options);
      });

      return true;
    };

    function copyToTrash(id) {
      var data = {}
      data.doc = self.getInfo(id);
      data.commits = self.commits(id);
      data.blobs = {};

      var ids = self.__list__();
      _.each(ids, function(id) {
        var blobs = self.__blobs__(id);
        _.each(blobs.keys(), function(blobId) {
          data.blobs[blobId] = blobs.get(blobId);
        });
      });
      self.__deletedDocuments__().set(id, data);
    }

    // Public Interface
    // ========

    // Checks if a document exists
    // --------

    proto.exists = function (id) {
      return this.__exists__(id);
    };

    // Creates a new document with the provided id
    // --------

    proto.create = function (id, options) {
      options = options || {};

      if(this.exists(id)) throw new errors.StoreError("Document already exists.");

      this.__init__(id);

      var meta = _.extend({
          "created_at": new Date(),
          "updated_at": new Date()
        }, options.meta);
      updateMeta(id, meta);

      if (options.refs) updateRefs(id, options.refs);

      if (options.commits) updateCommits(id, options.commits);

      return this.getInfo(id);
    };

    // Get document info (no contents)
    // --------

    proto.getInfo = function(id) {

      if(!this.exists(id)) throw new errors.StoreError("Document does not exists.");

      var doc = {id: id};
      doc.meta = this.__meta__(id).get();
      doc.refs = this.getRefs(id);

      return doc;
    };

    // List all documents (headers only)
    // --------

    proto.list = function () {
      var docs = [];

      _.each(this.__list__(), function(id){
        var doc = self.getInfo(id);
        docs.push(doc);
      });

      // sort the documents in descending order with respect to the time of the last update
      docs.sort(function(a, b) {
        return new Date(b.meta.updated_at) - new Date(a.meta.updated_at);
      });

      return docs;
    };

    // Retrieves a document
    // --------

    proto.get = function(id) {

      if(!this.exists(id)) throw new errors.StoreError("Document does not exists.");

      var doc = this.getInfo(id);
      doc.commits = this.__commits__(id).get();

      return doc;
    };

    // Retrieves a range of the document's commits
    // --------

    proto.commits = function(id, last, since) {
      var result = [];
      console.log("store.commits", id, last, since);

      var commits = this.__commits__(id);

      // if no range is specified return all commits
      if (arguments.length == 1 || (last === undefined && since === undefined)) {
        var all = commits.get();
        _.each(all, function(commit) {
          result.push(commit);
        });
        console.log("store.commits: result", result);
        return result;
      }
      else if (last === since) {
        console.log("store.commits: result", result);
        return result;
      }

      var commit = commits.get(last);

      if (!commit) {
        console.log("store.commits: result", result);
        return result;
      }

      commit.sha = last;
      result.unshift(commit);

      while (true) {
        commit = (commit.parent) ? commits.get(commit.parent) : null;
        if (!commit || commit.sha === since) break;
        result.unshift(commit);
      }

      console.log("store.commits: result", result);
      return result;
    };

    //  Permanently deletes a document
    // --------

    proto.delete = function (id) {
      copyToTrash(id);
      this.__delete__(id);
      return true;
    };

    //  Permanently delete all documents at once
    // --------

    proto.clear = function() {
      this.__clear__();
    };

    proto.update = function(id, options) {
      if(options.commits) updateCommits(id, options.commits);
      if(options.meta) updateMeta(id, options.meta);
      if(options.refs) updateRefs(id, options.refs);
      return true;
    }

    proto.getRefs = function(id, branch) {
      var refs = this.__refs__(id).get();
      if (branch) return refs[branch];
      else return refs;
    };

    proto.setRefs = function(id, branch, refs) {
      updateRefs(id, branch, refs);
      return true;
    };

    proto.deletedDocuments = function() {
      return this.__deletedDocuments__().keys();
    };

    proto.confirmDeletion = function(id) {
      this.__deletedDocuments__().delete(id);
      return true;
    };

    proto.seed = function(data) {
      this.clear();
      importDump(data);
      return true;
    };

    proto.dump = function() {
      var docs = {};

      var docIds = this.__list__();
      _.each(docIds, function(id) {
        docs[id] = this.get(id);
      });

      var dump = {
        'documents': docs,
        'deleted-documents': this.__deletedDocuments__().get()
      };

      return dump;
    };

    // Create a new blob for given data
    // --------

    proto.createBlob = function(docId, blobId, base64data) {
      var blobs = this.__blobs__(docId);

      if (blobs.contains(blobId)) throw new errors.StoreError("Blob already exists.");

      var blob = {
        id: blobId,
        document: docId,
        data: base64data
      };

      blobs.set(blobId, blob);
      return blob;
    };

    // Get Blob by id
    // --------

    proto.getBlob = function(docId, blobId) {
      var blobs = this.__blobs__(docId);
      if (!blobs.contains(blobId)) throw new errors.StoreError("Blob not found.");
      return blobs.get(blobId);
    };

    // Checks if blob exists
    // --------

    proto.blobExists = function (docId, blobId) {
      var blobs = this.__blobs__(docId);
      return blobs.contains(blobId);
    };

    // Delete blob by given id
    // --------

    proto.deleteBlob = function(docId, blobId) {
      var blobs = this.__blobs__(docId);
      blobs.delete(id);
      return true;
    };

    // Returns a list of blob ids
    // --------

    proto.listBlobs = function(docId) {
      var blobs = this.__blobs__(docId);
      var docIds = blobs.keys();
      return docIds;
    };


    // Abstract methods that must be implemented by sub-classes

    // Provides a list of ids
    // --------

    proto.__list__ = function () {
      throw "Called abstract method."
    }

    // Initializes all data structures for a new document
    // --------

    proto.__init__ = function (docId) {
      throw "Called abstract method."
    }

    // Initializes all data structures for a new document
    // --------

    proto.__delete__ = function (docId) {
      throw "Called abstract method."
    }

    // Provides a Hash type that is used to store deleted documents (= trash bin)
    // --------

    proto.__deletedDocuments__ = function () {
      throw "Called abstract method.";
    }

    // Checks if a document exists
    // --------

    proto.__exists__ = function (docId) {
      throw "Called abstract method."
    }

    // Provides a Hash type object that contains the meta information of a document.
    // --------

    proto.__meta__ = function (docId) {
      throw "Called abstract method."
    }

    // Provides a Hash type object that contains the references.
    // --------
    // branch is optional

    proto.__refs__ = function (docId, branch) {
      throw "Called abstract method.";
    }

    // Provides a Hash type that contains all documents commits accessable via commit sha
    // --------

    proto.__commits__ = function (docId) {
      throw "Called abstract method.";
    }

    // Provides a Hash type that contains stored blobs accessible via blob id.
    // --------

    proto.__blobs__ = function(docId) {
      throw "Called abstract method.";
    }

    // Clears the whole store
    // --------

    proto.__clear__ = function() {
      throw "Called abstract method.";
    }

  };

  // A helper class to adapt a javascript object to a unified hash interface
  // used by the store.
  // --------

  var Hash = function(obj) {
    if(!obj) throw "Illegal argument";

    this.obj = obj;

    this.contains = function(key) {
      return (!!obj[key]);
    };
    this.get = function(key) {
      if (arguments.length == 0) return obj;
      return obj[key];
    };
    this.set = function(key, value) {
      obj[key] = value;
    };
    this.keys = function() {
      return Object.keys(obj);
    };
    this.delete = function(key) {
      obj.delete(key);
    }
  };
  Store.Hash = Hash;

  // Exports
  if (typeof exports !== 'undefined') {
    exports.Store = Store;
  } else {
    root.Substance.Store = Store;
  }

})(this);
