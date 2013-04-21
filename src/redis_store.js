
(function(){

  var root = this;

  // Native extension
  if (typeof exports !== 'undefined') {
    var redis = require('../lib/redis');
    var errors = require('../../util/errors');
    var _ = require('underscore');
  } else {
    var redis = root.redis;
    var errors = root.Substance.errors;
    var _ = root._;
  }

  // TODO: discuss about error codes
  errors.define('RedisStoreError', -1);

  var RedisStore = function(settings) {

    // Initialization
    // --------

    // reference to this for use within instance methods
    var self = this;

    this.redis = redis.RedisAccess.Create(0);

    var defaults = {
      host: "127.0.0.1",
      port: 6379,
      scope: "substance"
    };

    var settings = _.extend(defaults, settings);

    this.redis.setHost(settings.host);
    this.redis.setPort(settings.port);

    // the scope is useful to keep parts of the redis db separated
    // e.g. tests would use its own, or one could separate user spaces
    self.redis.setScope(settings.scope);
    self.redis.connect();

    var documents = self.redis.asHash("documents");
    var blobs = self.redis.asHash("blobs");
    var deletedDocuments = self.redis.asHash("deleted-documents");


    // Private Methods
    // ========

    function markAsDeleted(id) {
      deletedDocuments.set(id, id);
      return true;
    }

    this.snapshotKey = function(id) {
      return id + ":snapshots"
    };


    // Public Interface
    // ========


    // Checks if a document exists
    // --------

    this.exists = function (id, cb) {
      var result = documents.contains(id);
      if (cb) cb(null, result);
      return result;
    };

    // Creates a new document with the provided id
    // --------

    this.create = function (id, cb) {
      if(self.exists(id) && cb) {
        return cb(new errors.RedisStoreError("Document already exists."));
      }

      var doc = {
        "id": id,
        "meta": {
          "created_at": new Date(),
          "updated_at": new Date()
        }
      };

      // TODO: what to do if this fails?
      // TODO: create initial list for commits
      documents.set(id, doc);

      if (cb) cb(null, doc);
      return doc;
    };

    // Updates an existing document with the provided metadata object
    // --------
    // 
    // meta:  object containing all metadata

    this.updateMeta = function(id, meta, cb) {
      if (!meta) {
        if (cb) cb(null);
        return true;
      }

      if (!self.exists(id) && cb) {
        cb(new errors.RedisStoreError("Document does not exist."));
        return false;
      }

      var doc = {
        "id": id,
        "meta": meta
      };

      documents.set(id, doc);
      if (cb) cb(null, doc);

      return true;
    };

    // Get document info (no contents)
    // --------

    this.getInfo = function(id, cb) {
      var doc = documents.getJSON(id);
      if (cb) cb(null, doc);
      return doc;
    };

    /**
     * List all documents complete with metadata
     */

    this.list = function (cb) {
      var docIds = documents.getKeys();
      var docs = [];

      for (var idx = 0; idx < docIds.length; ++idx) {
        var doc = documents.getJSON(docIds[idx]);

        doc.refs = {
          "master": {
            "head": self.getRef(docIds[idx], "master", "head"),
            "last": self.getRef(docIds[idx], "master", "last"),
          }
        };

        docs.push(doc);
      }

      // sort the documents in descending order with respect to the time of the last update
      docs.sort(function(a, b) {
        return new Date(b.meta.updated_at) - new Date(a.meta.updated_at);
      });

      if(cb) cb(null, docs);
      return docs;
    };

    /**
     *  Permanently deletes a document
     *  @param cb callback
     */

    this.delete = function (id, cb) {
      documents.remove(id);
      self.redis.removeWithPrefix(id);
      markAsDeleted(id);
      if (cb) cb(null);
      return true;
    };


    /**
     *  Stores a sequence of commits for a given document id.
     *
     *  @param newCommits an array of commit objects
     *  @param cb callback
     */
    function updateCommits(id, newCommits, cb) {

      // TODO: this does not to be asynchronous anymore as it is used privately only

      // No commits supplied. Go ahead
      if (newCommits.length === 0) {
        cb(null);
        return true;
      }

      var commitsKey = id + ":commits";
      var commits = self.redis.asList(commitsKey);

      // Note: we allow to update the document with commits pointing
      //       to a commit that does not need to be the last one.
      //       E.g. this happens after undoing commits and adding new changes.
      //       Instead of deleting the undone commits we keep them as detached refs
      //       which allows to recover such versions.

      // Find the parent commit
      var lastSha = newCommits[0].parent;
      if (lastSha && !self.redis.exists(commitsKey + ":" + lastSha)) {
        var msg = "Parent commit not found.";
        cb ? cb(new errors.RedisStoreError(msg)) : console.log(msg);
        return false;
      }

      for(var idx=0; idx<newCommits.length; idx++) {

        var commit = newCommits[idx];

        // commit must be in proper order
        if (lastSha && commit.parent != lastSha) {
          var err = new errors.RedisStoreError("Invalid commit chain.");
          cb ? cb(err) : console.log(err);
          return false;
        }

        lastSha = commit.sha;
      }

      // save the commits after knowing that everything is fine
      for (var idx = 0; idx < newCommits.length; idx++) {
        var commit = newCommits[idx];
        if (!_.isObject(commit)) {
          var err = new errors.RedisStoreError("Can not store empty commit.");
          if (cb) cb(err); else console.log(err);
          return false;
        }

        commits.addAsString(commit.sha);
        // store the commit's data into an own field
        self.redis.set(commitsKey + ":" + newCommits[idx].sha, commit);
      }

      self.setRef(id, "master", "head", lastSha);
      self.setRef(id, "master", "last", lastSha);

      // console.log('Stored these commits in the database', newCommits);

      if (cb) cb(null);
      return true;
    };

    function updateRefs(id, refs, cb) {
      _.each(refs, function(branchRefs, branch) {
        _.each(branchRefs, function(sha, ref) {
          self.setRef(id, branch, ref, sha);
        });
      });
      if (cb) cb(null);
      return true;
    }

    this.update_new = function(id, options, cb) {
      // TODO: remove this legacy dispatcher as soon we are stable again
      var success = true;

      // Note: providing a special error callback to pass through detailed error messages
      // but not messages on success which will be done once for all
      function errCb(err) {
        // don't call on success
        if(err) {
          console.log(err);
          if (cb) cb(err);
        }
      }

      // update the document depending on available data and stop if an error occurs
      if(options.commits) success = updateCommits(id, options.commits, errCb);
      if(success && options.meta) success = self.updateMeta(id, options.meta, errCb);
      if(success && options.refs) success = updateRefs(id, options.refs, errCb);

      if (cb && success) cb(null);

      return success;

    }


    // TODO: remove this legacy dispatcher as soon as we are stable again
    this.update = function(id, newCommits, cb_or_meta, refs, cb) {
      var meta = arguments.length < 4 ? null : cb_or_meta;
      var cb = arguments.length < 4 ? cb_or_meta : cb;
      var options = {
        commits: newCommits,
        meta: meta,
        refs: refs
      };
      return this.update_new(id, options, cb);
    };

    this.setRef = function(id, branch, ref, sha, cb) {
      self.redis.setString(id + ":refs:" + branch + ":" + ref, sha);
      if (cb) cb(null);
      return true;
    };

    this.getRef = function(id, branch, ref, cb) {
      var key = id + ":refs:" + branch + ":" + ref;
      var sha = self.redis.exists(key) ? self.redis.get(key) : null;
      if(cb) cb(null, sha);
      return sha;
    };

    this.setSnapshot = function (id, data, title, cb) {
      var snapshots = self.redis.asHash(self.snapshotKey(id));
      snapshots.set(title, data);
      if(cb) cb(null);
    };

    /**
     * Retrieves a range of the document's commits
     *
     * @param id the document's id
     * @param head where to start traversing the commits
     * @param stop the commit that is excluded
     */

    this.commits = function(id, head, stop, cb) {

      function getCommit(sha) {
        return self.redis.getJSON( id + ":commits:" + sha);
      }

      if (head === stop) return [];
      var commit = getCommit(head);

      if (!commit) {
        if (cb) cb(null, []);
        return [];
      }

      commit.sha = head;

      var commits = [commit];
      var prev = commit;

      while (commit = getCommit(commit.parent)) {
        if (stop && commit.sha === stop) break;
        commit.sha = prev.parent;
        commits.push(commit);
        prev = commit;
      }

      commits = commits.reverse();
      if (cb) cb(null, commits);
      return commits;
    };

    /**
     * Retrieves a document
     *
     * @param id the document's id
     * @param cb callback
     */
    this.get = function(id, cb) {

      if(!self.exists(id)) {
        var err = new errors.RedisStoreError("Document does not exist.");
        if (cb) cb(err);
        console.log(err);
        return null;
      }

      var doc = documents.getJSON(id);
      doc.commits = {};

      var lastSha = self.getRef(id, "master", "last");

      doc.refs = {
        "master" : {
          "head": self.getRef(id, "master", "head"),
          "last": lastSha,
        }
      };

      if (lastSha) {
        var commits = self.commits(id, lastSha);

        _.each(commits, function(c) {
          doc.commits[c.sha] = c;
        });
      }

      if (lastSha && !doc.commits[lastSha]) {
        var err = new errors.RedisStoreError('Corrupted Document: contains empty commits');
        console.log(err, doc);
        if (cb) cb(err);
        return null;
      }

      if(cb) cb(null, doc);
      return doc;
    };

    this.clear = function(cb) {
      self.redis.removeWithPrefix("");
      if (cb) cb(null);
    };


    this.deletedDocuments = function(cb) {
      var res = deletedDocuments.getKeys();
      if (cb) cb(null, res);
      return res;
    };

    this.confirmDeletion = function(id, cb) {
      var success = deletedDocuments.remove(id);
      if (!success) {
        var err = new errors.RedisStoreError("Could not confirm deletion.");
        if (cb) cb(err);
        else console.log(err);
      }
      return success;
    };

    // TODO: consider branches
    this.import = function(data, cb) {
      // var success = true;
      var success = _.every(data['documents'], function(doc, id) {
        if (self.exists(id)) {
          self.delete(id);
          self.confirmDeletion(id);
        }

        if (self.create(id)) {
          var commits = [];

          if (doc.refs.master.last) {
            var c = doc.commits[doc.refs.master.last];
            commits.push(c);

            while (c = doc.commits[c.parent]) {
              commits.push(c);
            }
          }

          // console.log('LE COMMITS MISSIEU', commits);
          var options = {
            commits: commits.reverse(),
            meta: doc.meta,
            refs: doc.refs
          };

          if (!self.update_new(id, options, cb)) {
            var err = new errors.RedisStoreError("Update failed.");
            if (cb) cb(err); else console.log(err);
            return false; // success = false;
          }
        } else {
          var err = new errors.RedisStoreError("Import failed.");
          if (cb) cb(err); else console.log(err);
          return false; // success = false;
        }
        return true;
      });

      return success;
    };

    this.seed = function(data, cb) {
      this.clear();
      this.import(data, cb);
      return true;
    };


    this.dump = function(cb) {
      // TODO: how to dump settings?
      var settings = {};
      var deletedDocs = [];

      var docs = {};
      var docInfos = self.list();

      _.each(docInfos, function(info, idx, docInfos) {
        docs[info.id] = self.get(info.id);
      });

      _.each(deletedDocuments.getKeys(), function(id) {
        deletedDocs.push(id);
      });

      var dump = {
        'documents': docs,
        'deleted-documents': deletedDocs
      };

      if (cb) cb(null, dump);
      return dump;
    };


    // Blob Interface
    // ========

    // Create a new blob for given data
    // --------

    this.createBlob = function(id, base64data, cb) {
      if (!this.blobExists(id)) {
        var blob = {
          data: base64data,
          id: id
        };

        blobs.set(id, blob);
        if (cb) cb(null, blob);
        return blob;
      } else {
        if (cb) cb(new errors.RedisStoreError("Blob already exists."));
        return false;
      }
    };


    // Get Blob by id
    // --------

    this.getBlob = function(id, cb) {
      var blob = blobs.getJSON(id);

      if (blob) {
        if (cb) cb(null, blob.data);
        return blob.data;
      } else {
        if (cb) cb(new errors.RedisStoreError("Blob not found."));  
        return null;
      }
    };

    // Checks if blob exists
    // --------

    this.blobExists = function (id, cb) {
      var result = blobs.contains(id);
      if (cb) cb(null, result);
      return result;
    };

    // Delete blob by given id
    // --------

    this.deleteBlob = function(id, cb) {
      blobs.remove(id);
      self.redis.removeWithPrefix(id);
      if (cb) cb(null);
      return true;
    };

    // Returns a list of blob ids
    // --------

    this.listBlobs = function(cb) {
      var docIds = blobs.getKeys();
      if (cb) cb(null, docIds);
      return docIds;
    };

  };

  RedisStore.prototype.name = "RedisStore";

  // Exports
  if (typeof exports !== 'undefined') {
    exports.RedisStore = RedisStore;
  } else {
    root.RedisStore = RedisStore;
    root.Substance.RedisStore = RedisStore;
  }

})(this);
