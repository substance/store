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

// Class Store
// ========
// A template implementation of a store used to manage and persist Substance documents.
//
var Store = function() {

  this.impl = new Store.__impl__(this);
  this.blobs = this.__blobs__();

};

var Store_private = function() {

  var private = this;

  this.recordStoreCommand = function(cmd, id, options) {
    var track = private.tracks.call(this, Store.MAIN_TRACK);
    var changes = private.changes.call(this, Store.MAIN_TRACK);
    var cid = util.uuid();

    var options = options || null;
    var parent = track.get(Store.CURRENT) || null;
    var cmd = [cmd, id, options];

    track.set(Store.CURRENT, cid);
    changes.set(cid, { command: cmd, parent: parent } );
  }

  this.recordUpdate = function(id, options, orig) {
    orig = orig || {};

    var track = private.tracks.call(this, id);
    var changes = private.changes.call(this, id);
    var parent = track.get(Store.CURRENT) || null;
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
    track.set(Store.CURRENT, cid);
  }

  // Retrieves a chain of commits from the given list list of commits
  this.getCommitChain = function(commit, commits) {
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

  this.commitsAsHash = function(commits) {
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

  this.getProperties = function(id, branch) {
    var refs = private.refs.call(this, id);
    if (!refs.contains(branch)) return {};

    var ref = refs.get(branch).head;

    // Note: this will invalidate when the referenced commit changes
    var properties_cache = private.properties_cache.call(this);
    var cached = properties_cache.get(id);
    if (cached && cached.ref === ref) return cached.properties;

    var doc = new Document({id: id});
    var commits = this.commits(id, ref);
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

  this.updateCommits = function(id, newCommits) {
    if (!newCommits || newCommits.length == 0) return true;

    var commits = private.commits.call(this, id);
    if (_.isArray(newCommits)) newCommits = private.commitsAsHash.call(this, newCommits);

    var pending = {};

    _.each(newCommits, function(commit) {
      if (!commits.contains(commit.sha)) {
        var chain = private.getCommitChain.call(this, commit, newCommits);
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

  this.updateMeta = function(id, meta) {
    if (!meta || meta.length == 0) return true;
    var __meta__ = private.meta.call(this, id);
    _.each(meta, function(val, key) {
      __meta__.set(key, val);
    })
    return true;
  };

  this.updateRefs = function(id, refs) {
    var __refs__ = private.refs.call(this, id);
    _.each(refs, function(refs, branch) {
      __refs__.extend(branch, refs);
    });
    return true;
  };

  this.update = function(id, options) {
    options = options || {};

    var orig = {}
    if(options.commits) private.updateCommits.call(this, id, options.commits);
    if(options.meta) {
      orig.meta = private.meta.call(this, id).dump();
      private.updateMeta.call(this, id, options.meta);
    }
    if(options.refs) {
      orig.refs = private.refs.call(this, id).dump();
      private.updateRefs.call(this, id, options.refs);
    }
    private.recordUpdate.call(this, id, options, orig);
    return true;
  };

  this.importDump = function(data) {
    _.each(data['documents'], function(doc, id) {
      if (this.exists(id)) {
        this.delete(id);
        this.confirmDeletion(id);
      }
      this.create(id)
      this.update(id, doc);
    }, this);
    return true;
  };

  this.copyToTrash = function(id) {

    var data = {}
    data.doc = this.getInfo(id);
    data.commits = this.commits(id);
    data.blobs = {};

    var ids = private.documents.call(this).keys();
    _.each(ids, function(id) {
      var blobs = private.blobs.call(this, id);
      _.each(blobs.keys(), function(blobId) {
        data.blobs[blobId] = blobs.get(blobId);
      });
    }, this);
    private.trash_bin.call(this).set(id, data);
  };

  // data stores for document data
  this.documents = function() { return this.impl.hash("documents"); };
  this.trash_bin = function() { return this.impl.hash("trashbin"); };
  this.meta = function(id) { return this.impl.hash("document", id, "meta"); };
  this.refs = function(id) { return this.impl.hash("document", id, "refs"); };
  this.commits = function(id) { return this.impl.hash("document", id, "commits"); };
  this.blobs = function(id) { return this.impl.hash("document", id, "blobs"); };
  this.properties_cache = function() { return this.impl.hash("properties_cache"); };

  // data structures to record store changes
  this.remotes = function() { return this.impl.hash("remotes"); };
  this.tracks = function(id) { return this.impl.hash("tracks", id); };
  this.changes = function(id) {
    return this.impl.hash("changes", id);
  };

};

// Store: Public Interface
// ========
//

Store.__prototype__ = function() {

  // Part of the implementation is hidden
  var private = new Store_private();

  this.store = function() {
    return this;
  }

  this.__blobs__ = function() {
    return new Store.Blobs(this, private);
  }

  // Checks if a document exists
  // --------

  this.exists = function (id) {
    return private.documents.call(this).contains(id);
  };

  // Creates a new document with the provided id
  // --------

  this.create = function (id, options) {
    options = options || {};

    if(this.exists(id)) throw new errors.StoreError("Document already exists.");
    // TODO: maybe we want to store more store specific bookkeeping information
    private.documents.call(this).set(id, true);
    private.recordStoreCommand.call(this, "create", id, {"role": "creator"});

    this.update(id, options);
    return this.getInfo(id);
  };

  // Get document info (no contents) which is aggregated by collecting all "set" type commits
  // which change the documents meta data.
  // --------

  this.getInfo = function(id) {
    if(!this.exists(id)) throw new errors.StoreError("Document does not exists.");

    var doc = {id: id};
    doc.properties = private.getProperties.call(this, id, "master");
    doc.meta = private.meta.call(this, id).dump();
    doc.refs = this.getRefs(id);

    return doc;
  };

  // Lists all documents.
  // --------
  // Calls getInfo(id) for all documents within this store.
  // The result is sorted wrt. the date of last update.

  this.list = function () {
    var __docs__ = private.documents.call(this);

    var docs = [];
    _.each(__docs__.keys(), function(id){
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
    if(!this.exists(id)) throw new errors.StoreError("Document does not exists.");

    var doc = this.getInfo(id);
    doc.commits = private.commits.call(this, id).dump();

    return doc;
  };

  // Retrieves a range of the document's commits
  // --------
  // If called without last and since, all commits are returned.
  // If called without since the whole branch is returned.

  this.commits = function(id, last, since) {
    var result = [];
    //console.log("store.commits", id, last, since);

    var commits = private.commits.call(this, id);

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

    private.copyToTrash.call(this, id);
    private.documents.call(this).delete(id);
    private.meta.call(this, id).clear();
    private.refs.call(this, id).clear();
    private.commits.call(this, id).clear();
    private.blobs.call(this, id).clear();
    private.recordStoreCommand.call(this, "delete", id);

    this.impl.delete(id);

    return true;
  };

  // Updates a document
  // --------
  //

  this.update = function(id, options) {
    return private.update.call(this, id, options);
  };

  this.getRefs = function(id, branch) {
    var refs = private.refs.call(this, id).dump();
    if (branch) return refs[branch];
    else return refs;
  };

  this.setRefs = function(id, branch, refs) {
    var options = {};
    options.branch = refs;
    return private.updateRefs.call(this, id, options);
  };

  this.deletedDocuments = function() {
    return private.trash_bin.call(this).keys();
  };

  this.confirmDeletion = function(id) {
    // do not physically delete for now
    return true;
  };

  this.seed = function(data) {
    this.impl.clear();
    private.importDump.call(this, data);
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
      'deleted-documents': private.trash_bin.call(this).dump()
    };

    return dump;
  };

  // Store managment API
  // ========
  //

  this.addRemote = function(id, options) {
    var remotes = private.remotes.call(this);
    if (remotes.contains(id)) throw new errors.StoreError("Remote store "+id+" has already been registered.");
    remotes.set(id, options);
  };

  this.updateRemote = function(id, options) {
    var remotes = private.remotes.call(this);
    if (!remotes.contains(id)) throw new errors.StoreError("Unknown remote store "+id);
    options = _.extend(remotes.get(id), options);
    remotes.set(id, options);
  };

  this.getChanges = function(id, start, since) {
    var result = [];
    var changes = private.changes.call(this, id);

    if(arguments.length == 1) {
      _.each(changes.keys(), function(key) {
        result.push(changes.get(key));
      });
      return result;
    }

    start = start || null;
    since = since || null;

    if (start === since || !changes.contains(start)) return result;

    var change;
    var cid = start;
    while(true) {
      if (cid === since) break;

      // how to treat this? the start and since are in different branches
      // Maybe it would be better to have
      if (cid == null) {
        return undefined;
      }

      change = changes.get(cid);
      result.push(change);

      if (!change) {
        throw new Error("Illegal state: changes");
      }
      cid = change.parent;
    }

    return result;
  };

  this.getDiff = function(storeId, trackId) {
    var track = private.tracks.call(this, trackId);
    var lastRemote = track.get(storeId);
    var last = track.get(Store.CURRENT);

    return this.getChanges(trackId, last, lastRemote);
  };

  this.getLastChange = function(trackId) {
    var track = private.tracks.call(this, trackId);
    var last = track.get(Store.CURRENT);

    return last;
  };

  this.applyCommand = function(trackId, command, data) {
    if (trackId === Store.MAIN_TRACK) private.applyStoreCommand.call(this, command, data);
    else private.applyDocumentCommand.call(this, trackId, command, data);
  }

};

Store.Blobs = function(store, private) {

  // Create a new blob for given data
  // --------

  this.create = function(docId, blobId, base64data) {
    var blobs = private.blobs.call(store, docId);
    var blob = {
      id: blobId,
      document: docId,
      data: base64data
    };

    if (blobs.contains(blobId)) throw new errors.StoreError("Blob already exists.");
    blobs.set(blobId, blob);
    private.recordUpdate.call(store, docId, {"blobs": [blobId]});

    return blob;
  };

  // Get Blob by id
  // --------

  this.get = function(docId, blobId) {
    var blobs = private.blobs.call(store, docId);
    if (!blobs.contains(blobId)) throw new errors.StoreError("Blob not found.");
    return blobs.get(blobId);
  };

  // Checks if blob exists
  // --------

  this.exists = function (docId, blobId) {
    var blobs = private.blobs.call(store, docId);
    return blobs.contains(blobId);
  };

  // Delete blob by given id
  // --------

  this.delete = function(docId, blobId) {
    var blobs = private.blobs.call(store, docId);
    blobs.delete(id);
    private.recordStoreCommand(docId, "blob", undefined);
    return true;
  };

  // Returns a list of blob ids
  // --------

  this.list = function(docId) {
    var blobs = private.blobs.call(store, docId);
    return blobs.keys();
  };

};

Store.MAIN_TRACK = "__store__";
Store.CURRENT = "__current__";

Store.defaultHashKey = function(args, scope) {
  var path = [];
  if (scope) path.push(scope);
  for (var idx=0; idx<args.length; idx++) {
    path.push(args[idx]);
  }
  return path.join(":");
}

// Store: Abstranct interface
// --------
// Must be implemented by subclasses.
//

Store.__impl__ = function(self) {

  // Returns a key value store for the given path.
  // --------
  //

  this.hash = function(path) {
    throw "Called abstract method.";
  };

  // Removes all data of a document
  // --------
  //
  this.delete = function (docId) {
    throw "Called abstract method."
  };

  // Clears the whole store
  // --------
  //
  this.clear = function() {
    throw "Called abstract method.";
  };

};

// Store: (quasi) private interface
// --------
// Meant for internal use.
//

Store.prototype = new Store.__prototype__();

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

  this.extend = function(key, obj) {
    var val = this.get(key) || {};
    if (!_.isObject(val)) new errors.StoreError("Stored value can not be extended.");
    _.extend(val, obj);
    this.set(key, val);
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
  // --------
  // gets called by this.get()

  this.__get__ = function(key) {
    throw new Error("Not implemented");
  };

  // Trivial setter
  // --------
  // gets called by this.set()

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
