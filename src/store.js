+
(function(){

var root = this;

if (typeof exports !== 'undefined') {
  var util = require('../../util/util');
  var errors = require('../../util/errors');
  var _ = require('underscore');
  var Document = require('../../document/document');
} else {
  var util = root.Substance.util;
  var errors = root.Substance.errors;
  var Document = root.Substance.Document;
  var _ = root._;
}

errors.define('StoreError', -1);

var Store = function() {
  this.__private__ = _.extend({}, this.__private__, new Store.__private__(this));
};

Store.__private__ = function(self) {

  this.__recordStoreCommand__ = function(cmd, id, options) {
    var track = this.__tracks__('__store__');
    var changes = this.__changes__("__store__");
    var cid = util.uuid();

    var options = options || null;
    var parent = track.get('__self__') || null;
    var cmd = [cmd, id, options];

    track.set("__self__", cid);
    changes.set(cid, { command: cmd, parent: parent } );
  }

  this.__recordUpdate__ = function(id, options, orig) {
    orig = orig || {};

    var track = this.__tracks__(id);
    var changes = this.__changes__(id);
    var parent = track.get('__self__') || null;
    var cid = util.uuid();

    var tmp = {};

    _.each(options, function(data, type) {
      if (type === "meta" || type === "refs") {
        data = util.diff(orig[type], data);
      } else if (type === "commits") {
        data = _.pluck(data, "sha");
      }
      tmp[type] = data;
    });

    options = tmp;
    var cmd = ["update", id, options];

    changes.set(cid, { command: cmd, parent: parent } );
    track.set("__self__", cid);
  }

  // Retrieves a chain of commits from the given list list of commits
  this.__getCommitChain__ = function(commit, commits) {
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

  this.__commitsAsHash__ = function(commits) {
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

  // Extracts the documents properties from a branch
  // --------
  //

  this.__getProperties__ = function(id, branch) {
    var refs = this.__refs__(id);
    if (!refs.contains(branch)) return {};

    var ref = refs.get(branch).head;

    // Note: this will invalidate when the referenced commit changes
    var properties_cache = this.__properties_cache__();
    var cached = properties_cache.get(id);
    if (cached && cached.ref === ref) return cached.properties;

    var doc = new Document({id: id});
    var commits = self.commits(id, ref);
    _.each(commits, function(c) {
      if (c.op[0] === "set") {
        doc.apply(c.op, {"silent":true, "no-commit":true});
      };
      doc.properties.updated_at = c.date;
    });

    properties_cache.set(id, {ref: ref, properties: doc.properties});

    return doc.properties;
  }

  // Imports new commits which are provided as a hash.
  // --------
  // The commits must reference each other to build a valid commit tree (or forest)
  // with the root being an already registered commit.

  this.__updateCommits__ = function(id, newCommits) {
    if (!newCommits || newCommits.length == 0) return true;

    var commits = this.__commits__(id);
    if (_.isArray(newCommits)) newCommits = this.__commitsAsHash__(newCommits);

    var pending = {};

    _.each(newCommits, function(commit) {
      if (!commits.contains(commit.sha)) {
        var chain = this.__getCommitChain__(commit, newCommits);
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
          });
        }
      }
    }, this);

    // after all commits went through the check
    _.each(pending, function(commit, sha) {
      commits.set(sha, commit);
    });

    return true;
  };

  this.__updateMeta__ = function(id, meta) {
    if (!meta || meta.length == 0) return true;
    var __meta__ = this.__meta__(id);
    _.each(meta, function(val, key) {
      __meta__.set(key, val);
    })
    return true;
  };

  this.__updateRefs__ = function(id, refs) {
    var __refs__ = this.__refs__(id);
    _.each(refs, function(refs, branch) {
      var newRefs = __refs__.get(branch) || {};
      _.extend(newRefs, refs);
      __refs__.set(branch, newRefs);
    });
    return true;
  };

  this.__update__ = function(id, options) {
    options = options || {};

    var orig = {}
    if(options.commits) this.__updateCommits__(id, options.commits);
    if(options.meta) {
      orig.meta = this.__meta__(id).dump();
      this.__updateMeta__(id, options.meta);
    }
    if(options.refs) {
      orig.refs = this.__refs__(id).dump();
      this.__updateRefs__(id, options.refs);
    }
    this.__recordUpdate__(id, options, orig);
    return true;
  };

  this.__importDump__ = function(data) {
    _.each(data['documents'], function(doc, id) {
      if (self.exists(id)) {
        self.delete(id);
        self.confirmDeletion(id);
      }
      self.create(id)
      self.update(id, doc);
    });
    return true;
  };

  this.__copyToTrash__ = function(id) {
    var data = {}
    data.doc = self.getInfo(id);
    data.commits = self.commits(id);
    data.blobs = {};

    var ids = this.__documents__().keys();
    _.each(ids, function(id) {
      var blobs = this.__blobs__(id);
      _.each(blobs.keys(), function(blobId) {
        data.blobs[blobId] = blobs.get(blobId);
      });
    }, this);
    this.__trash_bin__().set(id, data);
  };

  // data stores for document data
  this.__documents__ = function() { return self.__impl__.hash("documents"); };
  this.__trash_bin__ = function() { return self.__impl__.hash("trashbin"); };
  this.__meta__ = function(id) { return self.__impl__.hash("meta", id); };
  this.__refs__ = function(id) { return self.__impl__.hash("refs", id); };
  this.__commits__ = function(id) { return self.__impl__.hash("commits", id); };
  this.__blobs__ = function(id) { return self.__impl__.hash("blobs", id); };
  this.__properties_cache__ = function() { return self.__impl__.hash("properties_cache"); };

  // data structures to record store changes
  this.__remotes__ = function() { return self.__impl__.hash("remotes"); };
  this.__tracks__ = function(id) { return self.__impl__.hash("tracks", id); };
  this.__changes__ = function(id) { return self.__impl__.hash("changes", id); };

};

Store.__prototype__ = function() {

  // Public Interface
  // ========

  // Checks if a document exists
  // --------

  this.exists = function (id) {
    var p = this.__private__;
    return p.__documents__().contains(id);
  };

  // Creates a new document with the provided id
  // --------

  this.create = function (id, options) {
    options = options || {};
    var p = this.__private__;

    if(this.exists(id)) throw new errors.StoreError("Document already exists.");
    // TODO: maybe we want to store more store specific bookkeeping information
    p.__documents__().set(id, true);
    p.__recordStoreCommand__("create", id, {"role": "creator"});

    this.update(id, options);
    return this.getInfo(id);
  };

  // Get document info (no contents) which is aggregated by collecting all "set" type commits
  // which change the documents meta data.
  // --------

  this.getInfo = function(id) {
    var p = this.__private__;

    if(!this.exists(id)) throw new errors.StoreError("Document does not exists.");

    var doc = {id: id};
    doc.properties = p.__getProperties__(id, "master");
    doc.meta = p.__meta__(id).dump();
    doc.refs = this.getRefs(id);

    return doc;
  };

  // Lists all documents.
  // --------
  // Calls getInfo(id) for all documents within this store.
  // The result is sorted wrt. the date of last update.

  this.list = function () {
    var p = this.__private__;

    var docs = [];
    _.each(p.__documents__().keys(), function(id){
      var doc = this.getInfo(id);
      docs.push(doc);
    }, this);

    // sort the documents in descending order with respect to the time of the last update
    docs.sort(function(a, b) {
      // Note: meta is a dynamic meta property generated by getInfo
      return new Date(b.meta.updated_at) - new Date(a.meta.updated_at);
    });

    return docs;
  };

  // Retrieves a document
  // --------
  // Returns a document that is compatible to the format as used in Substance.Document.

  this.get = function(id) {
    var p = this.__private__;

    if(!this.exists(id)) throw new errors.StoreError("Document does not exists.");

    var doc = this.getInfo(id);
    doc.commits = p.__commits__(id).dump();

    return doc;
  };

  // Retrieves a range of the document's commits
  // --------
  // If called without last and since, all commits are returned.
  // If called without since the whole branch is returned.

  this.commits = function(id, last, since) {
    var p = this.__private__;

    var result = [];
    //console.log("store.commits", id, last, since);

    var commits = p.__commits__(id);

    // if no range is specified return all commits
    if (arguments.length == 1 || (last === undefined && since === undefined)) {
      var all = commits.dump();
      _.each(all, function(commit) {
        result.push(commit);
      });
      return result;
    }
    else if (last === since) {
      return result;
    }

    var commit = commits.get(last);

    if (!commit) {
      return result;
    }

    commit.sha = last;
    result.unshift(commit);

    while (true) {
      commit = (commit.parent) ? commits.get(commit.parent) : null;
      if (!commit || commit.sha === since) break;
      result.unshift(commit);
    }

    //console.log("store.commits: result", result);
    return result;
  };

  // Deletes a document
  // --------
  // The document is stored into a trash bin.
  // TODO: add a way to recover a deleted document
  // TODO: add a way to empty the trash bin permanently

  this.delete = function (id) {
    var p = this.__private__;
    p.__copyToTrash__(id);
    p.__documents__().delete(id);
    p.__meta__(id).clear();
    p.__refs__(id).clear();
    p.__commits__(id).clear();
    p.__blobs__(id).clear();
    p.__recordStoreCommand__("delete", id);
    this.__impl__.delete(id);
    return true;
  };

  // Updates a document
  // --------
  //

  this.update = function(id, options) {
    var p = this.__private__;
    return p.__update__(id, options);
  }

  this.getRefs = function(id, branch) {
    var p = this.__private__;
    var refs = p.__refs__(id).dump();
    if (branch) return refs[branch];
    else return refs;
  };

  this.setRefs = function(id, branch, refs) {
    var p = this.__private__;
    var options = {};
    options.branch = refs;
    return p.__updateRefs__(id, options);
  };

  this.deletedDocuments = function() {
    var p = this.__private__;
    return p.__trash_bin__().keys();
  };

  this.confirmDeletion = function(id) {
    // do not physically delete for now
    return true;
  };

  this.seed = function(data) {
    var p = this.__private__;
    this.__impl__.clear();
    p.__importDump__(data);
    return true;
  };

  this.dump = function() {
    var docs = {};

    var docIds = this.list();
    _.each(docIds, function(id) {
      docs[id] = this.get(id);
    }, this);

    var dump = {
      'documents': docs,
      'deleted-documents': this.__trash_bin__().dump()
    };

    return dump;
  };

  // Create a new blob for given data
  // --------

  this.createBlob = function(docId, blobId, base64data) {
    var p = this.__private__;
    var blobs = p.__blobs__(docId);

    if (blobs.contains(blobId)) throw new errors.StoreError("Blob already exists.");

    var blob = {
      id: blobId,
      document: docId,
      data: base64data
    };

    blobs.set(blobId, blob);

    p.__recordUpdate__(docId, {"blobs": [blobId]});

    return blob;
  };

  // Get Blob by id
  // --------

  this.getBlob = function(docId, blobId) {
    var p = this.__private__;
    var blobs = p.__blobs__(docId);
    if (!blobs.contains(blobId)) throw new errors.StoreError("Blob not found.");
    return blobs.get(blobId);
  };

  // Checks if blob exists
  // --------

  this.blobExists = function (docId, blobId) {
    var p = this.__private__;
    var blobs = p.__blobs__(docId);
    return blobs.contains(blobId);
  };

  // Delete blob by given id
  // --------

  this.deleteBlob = function(docId, blobId) {
    var p = this.__private__;
    var blobs = p.__blobs__(docId);
    blobs.delete(id);
    p.recordUpdate(docId, "blob", undefined);
    return true;
  };

  // Returns a list of blob ids
  // --------

  this.listBlobs = function(docId) {
    var p = this.__private__;
    var blobs = p.__blobs__(docId);
    return blobs.keys();
  };


  // Store managment API
  // ========
  //

  this.addRemote = function(id, options) {
    var p = this.__private__;
    var remotes = p.__remotes__();
    if (remotes.contains(id)) {
      throw new errors.StoreError("Remote store "+id+" has already been registered.");
    }
    remotes.set(id, options);
  }

  this.updateRemote = function(id, options) {
    var p = this.__private__;
    var remotes = p.__remotes__();
    if (!remotes.contains(id)) {
      throw new errors.StoreError("Unknow remote store "+id);
    }
    options = _.extend(remotes.get(id), options);
    remotes.set(id, options);
  }

  this.getChanges = function(id, start, since) {
    var p = this.__private__;
    var result = [];
    var changes = p.__changes__(id);

    if(arguments.length == 1) {
      _.each(changes.keys(), function(key) {
        result.push(changes.get(key));
      });
      return result;
    }

    if (start === since) return result;

    var change;
    var cid = start;
    while(true) {
      if (cid === null || cid === since) break;
      result.push(change);

      change = changes.get(cid);
      if (!change) {
        throw new Error("Illegal state: changes");
      }
      cid = change.parent;
    }

    return result;
  }

  this.getDiff = function(storeId, trackId) {
    var p = this.__private__;
    var stores = p.__stores__();

    if (!stores.contains(id)) {
      throw new errors.StoreError("Unknow remote store "+id);
    }

    var track = this.__tracks__(trackId);
    var lastRemote = track.get(storeId);
    var last = track.get('__self__');

    return this.getChanges(trackId, last, lastRemote);
  }

  this.__impl__ = {

    // Returns a key value store for the given path.
    // --------
    //

    hash: function(path) {
      throw "Called abstract method.";
    },

    // Removes all data of a document
    // --------
    //
    delete: function (docId) {
      throw "Called abstract method."
    },

    // Clears the whole store
    // --------
    //
    clear: function() {
      throw "Called abstract method.";
    }

  };

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

    this.contains = function(key) {
      var keys = this.keys();
      if (!keys) return false;
      else return keys.indexOf(key) >= 0;
    };

    this.keys = function() {
      var keys = this.__get__("__keys__");
      if (!keys) {
        this.__set__("__keys__", []);
        keys = [];
      }
      if (keys.indexOf(null) >= 0) {
        console.log(util.callstack());
      }
      return keys;
    };

    this.get = function(key) {
      if(!this.contains(key)) {
        //throw new errors.StoreError("Unknown key:"+key);
        return undefined;
      }
      return this.__get__(key);
    };

    this.set = function(key, value) {
      if (!key) throw new errors.StoreError("Illegal key:"+key);
      var keys = _.without(this.keys(), key);
      keys.push(key);
      this.__set__("__keys__", keys);
      this.__set__(key, value);
    };

    this.delete = function(key) {
      var keys = _.without(this.keys(), key);
      this.__set__("__keys__", keys);
      this.__set__(key, undefined);
    };

    this.clear = function() {
      var keys = this.keys();
      _.each(keys, function(key) {
        this.delete(key);
      }, this);
      this.__set__("__keys__", []);
    };

    this.dump = function() {
      var keys = this.keys();
      var result = {};
      _.each(keys, function(key) {
        result[key] = this.__get__(key);
      }, this);
      return result;
    };

    // Trivial getter
    this.__get__ = function(key) {
      throw new Error("Not implemented");
    };

    // Trivial setter
    this.__set__ = function(key, value) {
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
