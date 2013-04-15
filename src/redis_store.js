(function(ctx){

  // Native extension
  var redis = typeof exports !== 'undefined' ? require('../lib/redis') : ctx.redis;
  var _ = typeof exports !== 'undefined' ? require('underscore') : ctx._;


  var RedisStore = function(settings) {
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
    var deletedDocuments = self.redis.asHash("deleted-documents");


    function markAsDeleted(id) {
      deletedDocuments.set(id, id);
      return true;
    }

    this.snapshotKey = function(id) {
      return id + ":snapshots"
    };

    /**
     *  Checks if a document exists
     *  @param id the document's id
     *  @param cb callback
     */

    this.exists = function (id, cb) {
      var result = documents.contains(id);
      if (cb) cb(result);
      return result;
    };

    /**
     * Creates a new document with the provided id
     * @param cb callback
     */
    this.create = function (id, cb) {
      if(self.exists(id) && cb) {
        return cb({err: -1, msg: "Document already exists."});
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

    /**
     * Updates an existing document with the provided metadata object
     * @param id the document id
     * @param meta object containing all metadata
     * @param cb callback
     */

    // TODO should be private now
    this.updateMeta = function(id, meta, cb) {
      if (!meta) {
        if (cb) cb(null);
        return true;
      }

      if (!self.exists(id) && cb) {
        cb({err: -1, msg: "Document does not exist."});
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

    /**
     * Get document info (no contents)
     */

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
          "master": self.getRef(docIds[idx], "master"),
          "tail": self.getRef(docIds[idx], "tail"),
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
        cb ? cb({"error": msg}) : console.log(msg);
        return false;
      }

      for(var idx=0; idx<newCommits.length; idx++) {

        var commit = newCommits[idx];

        // commit must be in proper order
        if (lastSha && commit.parent != lastSha) {
          var err = {err: -1, msg: "Invalid commit chain."};
          cb ? cb(err) : console.log(err.msg);
          return false;
        }

        lastSha = commit.sha;
      }

      // save the commits after knowing that everything is fine
      for (var idx = 0; idx < newCommits.length; idx++) {
        var commit = newCommits[idx];
        if (!_.isObject(commit)) throw "Can not store empty commit.";

        commits.addAsString(commit.sha);
        // store the commit's data into an own field
        self.redis.set(commitsKey + ":" + newCommits[idx].sha, commit);
      }

      self.setRef(id, "master", lastSha);
      self.setRef(id, "tail", lastSha);

      // console.log('Stored these commits in the database', newCommits);

      if (cb) cb(null);
      return true;
    };

    function updateRefs(id, refs, cb) {
      _.each(refs, function(value, key, refs) {
        self.setRef(id, key, value);
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
        if (cb && err) cb(err);
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
      return this.update_new(id, {
        commits: newCommits,
        meta: meta,
        refs: refs
      }, cb);
    };

    this.setRef = function(id, ref, sha, cb) {
      self.redis.setString(id + ":refs:" + ref, sha);
      if (cb) cb(null);
      return true;
    };

    this.getRef = function(id, ref, cb) {
      var key = id + ":refs:" + ref;
      var sha = self.redis.exists(key) ? self.redis.get(key) : null;

      if(cb) cb(0, sha);
      return sha;
    };

    this.setSnapshot = function (id, data, title, cb) {
      var snapshots = self.redis.asHash(self.snapshotKey(id));
      snapshots.set(title, data);
      if(cb) { cb(null); }
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
        if (cb) cb({error: "Document does not exist."});
        return null;
      }

      var doc = documents.getJSON(id);
      doc.commits = {};

      var lastSha = self.getRef(id, "tail");

      doc.refs = {
        "master": self.getRef(id, "master"),
        "tail": lastSha,
      };

      if (lastSha) {
        var commits = self.commits(id, lastSha);

        _.each(commits, function(c) {
          doc.commits[c.sha] = c;
        });
      }

      if (lastSha && !doc.commits[lastSha]) {
        console.log('Corrupted Document: ', doc);
        throw "Document corrupted, contains empty commit";
      }

      if(cb) cb(0, doc);
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
      var res = deletedDocuments.remove(id);
      if (cb) cb(res ? null : 'could_not_confirm_deletion');
      return res;
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

          if (doc.refs.tail) {
            var c = doc.commits[doc.refs.tail];
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
            console.log('update failed');
            if (cb) cb('update_failed');
            return false; // success = false;
          }
        } else {
          if (cb) cb('import_failed');
          return false; // success = false;
        }
        return true;
      });

      // cb(success ? null : 'import_failed');
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

  };

  RedisStore.prototype.name = "RedisStore";

  // Exports
  if (typeof exports !== 'undefined') {
    exports.RedisStore = RedisStore;
  } else {
    if (!ctx.Substance) ctx.Substance = {};
    ctx.RedisStore = RedisStore;
    ctx.Substance.RedisStore = RedisStore;
  }
})(this);
