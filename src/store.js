
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

    // accessors for stored data
    var __documents__ = function() { return self.__hash__(["documents"]); };
    var __trash_bin__ = function() { return self.__hash__(["trashbin"]); };
    var __meta__ = function(id) { return self.__hash__(["document", id, "meta"]); };
    var __refs__ = function(id) { return self.__hash__(["document", id, "refs"]); };
    var __commits__ = function(id) { return self.__hash__(["document", id, "commits"]); };
    var __blobs__ = function(id) { return self.__hash__(["document", id, "blobs"]); };
    var __remotes__ = function() { return self.__hash__(["remotes"]); };
    var __changes__ = function(id) { return self.__hash__(["changes", id]); };

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

      var commits = __commits__(id);
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
      var _meta = __meta__(id);
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

      var _refs = __refs__(id);
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

        // console.log('LE commits MISSIEU', commits);
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

      var ids = __documents__().keys();
      _.each(ids, function(id) {
        var blobs = __blobs__(id);
        _.each(blobs.keys(), function(blobId) {
          data.blobs[blobId] = blobs.get(blobId);
        });
      });
      __trash_bin__().set(id, data);
    }

    // Public Interface
    // ========

    // Checks if a document exists
    // --------

    proto.exists = function (id) {
      return __documents__().contains(id);
    };

    // Creates a new document with the provided id
    // --------

    proto.create = function (id, options) {
      options = options || {};

      if(this.exists(id)) throw new errors.StoreError("Document already exists.");

      // TODO: maybe we want to store more store specific bookkeeping information
      __documents__(id).set(id, true);

      var meta = {
        "created_at": new Date(),
        "updated_at": new Date()
      };
      meta = _.extend(meta, options.meta);
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
      doc.meta = __meta__(id).dump();
      doc.refs = this.getRefs(id);

      return doc;
    };

    // List all documents (headers only)
    // --------

    proto.list = function () {
      var docs = [];

      _.each(__documents__().keys(), function(id){
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
      doc.commits = __commits__(id).dump();

      return doc;
    };

    // Retrieves a range of the document's commits
    // --------

    proto.commits = function(id, last, since) {
      var result = [];
      console.log("store.commits", id, last, since);

      var commits = __commits__(id);

      // if no range is specified return all commits
      if (arguments.length == 1 || (last === undefined && since === undefined)) {
        var all = commits.dump();
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
      __documents__().delete(id);
      __meta__(id).clear();
      __refs__(id).clear();
      __commits__(id).clear();
      __blobs__(id).clear();
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
      var refs = __refs__(id).dump();
      if (branch) return refs[branch];
      else return refs;
    };

    proto.setRefs = function(id, branch, refs) {
      updateRefs(id, branch, refs);
      return true;
    };

    proto.deletedDocuments = function() {
      return __trash_bin__().keys();
    };

    proto.confirmDeletion = function(id) {
      // do not physically delete for now
      return true;
    };

    proto.seed = function(data) {
      this.clear();
      importDump(data);
      return true;
    };

    proto.dump = function() {
      var docs = {};

      var docIds = this.list();
      _.each(docIds, function(id) {
        docs[id] = this.get(id);
      });

      var dump = {
        'documents': docs,
        'deleted-documents': __trash_bin__().dump()
      };

      return dump;
    };

    // Create a new blob for given data
    // --------

    proto.createBlob = function(docId, blobId, base64data) {
      var blobs = __blobs__(docId);

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
      var blobs = __blobs__(docId);
      if (!blobs.contains(blobId)) throw new errors.StoreError("Blob not found.");
      return blobs.get(blobId);
    };

    // Checks if blob exists
    // --------

    proto.blobExists = function (docId, blobId) {
      var blobs = __blobs__(docId);
      return blobs.contains(blobId);
    };

    // Delete blob by given id
    // --------

    proto.deleteBlob = function(docId, blobId) {
      var blobs = __blobs__(docId);
      blobs.delete(id);
      return true;
    };

    // Returns a list of blob ids
    // --------

    proto.listBlobs = function(docId) {
      var blobs = __blobs__(docId);
      var docIds = blobs.keys();
      return docIds;
    };


    // Store managment API
    // ========
    //

    proto.addRemote = function(id, options) {
      var remotes = __remotes__();
      if (remotes.contains(id)) {
        throw new errors.StoreError("Remote store "+id+" has already been registered.");
      }
      remotes.set(id, options);
    }

    proto.updateRemote = function(id, options) {
      var remotes = __remotes__();
      if (!remotes.contains(id)) {
        throw new errors.StoreError("Unknow remote store "+id);
      }
      options = _.extend(remotes.get(id), options);
      remotes.set(id, options);
    }

    proto.getChanges = function(remoteId, trackId) {
      /*
      var remotes = __remotes__();
      if (!remotes.contains(id)) {
        throw new errors.StoreError("Unknow remote store "+id);
      }
      var remote = remotes.get(remoteId);
      var last = remote.[trackId];
      if (!last) {
        // TODO: the track has not yet been synchronized
      }

      */
    }

    proto.__hash__ = function(path) {
      throw "Called abstract method.";
    }

     // Removes all data of a document
    // --------
    //
    proto.__delete__ = function (docId) {
      throw "Called abstract method."
    }

    // Clears the whole store
    // --------
    //
    proto.__clear__ = function() {
      throw "Called abstract method.";
    }


  };

  // A helper class to adapt a javascript object to a unified hash interface
  // used by the store.
  // --------
  // Note: the hash keeps the keys in order of changes. I.e., the last changed key will be last of keys()

  // An abstract hash implementation that can be used to adapt data structures
  // to the Store.Hash interface easily.
  // --------
  //
  Store.AbstractHash = function() {

    var proto = util.prototype(this);

    proto.contains = function(key) {
      var keys = this.keys();
      if (!keys) return false;
      else return keys.indexOf(key) >= 0;
    };

    proto.keys = function() {
      var keys = this.__get__("__keys__");
      if (!keys) {
        this.__set__("__keys__", []);
        keys = [];
      }
      if (keys.indexOf(null) >= 0) {
        console.log("AAAAAAA", util.callstack());
      }
      return keys;
    };

    proto.get = function(key) {
      if(!this.contains(key)) {
        //throw new errors.StoreError("Unknown key:"+key);
        return undefined;
      }
      return this.__get__(key);
    };

    proto.set = function(key, value) {
      if (!key) throw new errors.StoreError("Illegal key:"+key);
      var keys = _.without(this.keys(), key);
      keys.push(key);
      this.__set__("__keys__", keys);
      this.__set__(key, value);
    };

    proto.delete = function(key) {
      var keys = _.without(this.keys(), key);
      this.__set__("__keys__", keys);
      this.__set__(key, undefined);
    };

    proto.clear = function() {
      var keys = this.keys();
      var self = this;
      _.each(keys, function(key) {
        self.delete(key);
      });
      self.__set__("__keys__", []);
    };

    proto.dump = function() {
      var keys = this.keys();
      var self = this;
      var result = {};
      _.each(keys, function(key) {
        result[key] = self.__get__(key);
      });
      return result;
    };

    // Trivial getter
    proto.__get__ = function(key) {
      throw new Error("Not implemented");
    };

    // Trivial setter
    proto.__set__ = function(key, value) {
      throw new Error("Not implemented");
    };

  };

  // Exports
  if (typeof exports !== 'undefined') {
    exports.Store = Store;
  } else {
    root.Substance.Store = Store;
  }

})(this);
