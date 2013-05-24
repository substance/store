// Replicator

(function() {

var root = this;
var util = Substance.util;
var Store = Substance.Store;

var Replicator = function(params) {

  // a synchronous store, typically the localStore
  this.local = params.local;
  this.remote = params.remote;
  this.remoteID = params.remoteID;

  this.storeMerge = new Replicator.StoreMergeStrategy();
  this.documentMerge = new Replicator.DocumentMergeStrategy();

};

var Replicator_private = function() {

  var private = this;

  this.syncChanges = function(trackId, cb) {
    var self = this;

    var localIndex;
    var remoteIndex;
    var localDiff;
    var remoteDiff;
    var localChanges;
    var remoteChanges;

    var merged;

    function getIndex(cb) {
      localIndex = self.local.getIndex(trackId)
      self.remote.getIndex(trackId, function(err, data) {
        remoteIndex = data;
        console.log("Replicator.syncChanges.getIndex:", "localIndex", localIndex, "remoteIndex", remoteIndex);
        cb(err);
      });
    }

    function computeDiff(cb) {
      var tmp_local = {}
      var tmp_remote = {}

      localDiff = [];
      remoteDiff = [];

      // Note: localIndex and remoteIndex is the list of all changes
      //  in descending order (latest = first)
      // OTOH, the resulting lists of ids, localDiff and remoteDiff,
      //  are in ascending order (oldest = first)

      for(var idx = 0; idx < localIndex.length; idx++) {
        tmp_local[localIndex[idx]] = true;
      }
      for(var idx = 0; idx < remoteIndex.length; idx++) {
        tmp_remote[remoteIndex[idx]] = true;
      }
      for(var idx = 0; idx < localIndex.length; idx++) {
        var id = localIndex[idx];
        if(!tmp_remote[id]) localDiff.unshift(id);
        else break;
      }
      for(var idx = 0; idx < remoteIndex.length; idx++) {
        var id = remoteIndex[idx];
        if(!tmp_local[id]) remoteDiff.unshift(id);
        else break;
      }

      console.log("Replicator.syncChanges.computeDiff:", "localDiff", localDiff, "remoteDiff", remoteDiff);

      cb(null);
    }

    function getChanges(cb) {
      // Note: currently we fetch all ids before the last
      //  This could be improved by keeping the last synched change for every remote repos.
      //  For now we keep the mechanism simple.
      localChanges = self.local.getChanges(trackId, localDiff) || [];
      self.remote.getChanges(trackId, remoteDiff, function(err, data) {
        remoteChanges = data || [];
        console.log("Changes:", trackId, ", mine:", JSON.stringify(localChanges), ", theirs:", JSON.stringify(remoteChanges));
        cb(err);
      });
    }

    function merge(cb) {
      merged = private.merge.call(self, trackId, {mine: localChanges, theirs: remoteChanges});
      console.log("Merged:", trackId, ", mine:", JSON.stringify(merged.mine),
        ", theirs:", JSON.stringify(merged.theirs));
      cb(null);
    };

    function fetchData(cb) {
      if (trackId !== Store.MAIN_TRACK) {
        var docId = trackId;

        _.each(merged.theirs, function(change) {
          var cid = change.id;
          var cmd = change.command[0];
          if (cmd == "update") {
            var data = {};
            var options = change.command[2];
            if (options.commits) {
              var commitIds = options.commits;
              var commits = self.local.commits(docId, {commits: commitIds});
              data.commits = commits;
            }
            change.data = data;
          }
        });

        var options = {
          items: merged.mine,
          iterator: function(change, cb) {
            var cid = change.id;
            var cmd = change.command[0];
            var options = change.command[2];
            if (cmd != "update" || !options.commits) return cb(null);

            var options = change.command[2];
            var commitIds = options.commits;

            self.remote.commits(docId, {commits: commitIds}, function(err, commits) {
              if (err) return cb(err);
              var data = {};
              data.commits = commits
              change.data = data;
              cb(null);
            });
          }
        }
        util.async.each(options, cb);

      } else cb(null);
    }

    function sync(cb) {
      // TODO: apply merge locally
      _.each(merged.mine, function(change) {
        self.local.applyCommand(trackId, change);
      });

      var options = {
        items: merged.theirs,
        iterator: function(change, cb) {
          self.remote.applyCommand(trackId, change, cb);
        }
      };
      util.async.each(options, cb);
    }

    util.async.sequential([getIndex, computeDiff, getChanges, merge, fetchData, sync], cb);
  };

  this.merge = function(trackId, changes) {
    if (trackId === Store.MAIN_TRACK) return this.storeMerge.merge(changes);
    else return this.documentMerge.merge(changes);
  }

}

Replicator.__prototype__ = function() {

  var private = new Replicator_private();

  this.sync = function(cb) {

    var self = this;

    function syncStoreChanges(cb) {
      private.syncChanges.call(self, Store.MAIN_TRACK, cb);
    }

    function syncDocumentChanges(cb) {
      // Note: currently only active documents get synced, i.e. not those documents
      // that are in the trashbin.
      var docs = self.local.list();

      var options = {
        items: docs,
        iterator: function(doc, cb) {
          private.syncChanges.call(self, doc.id, cb);
        }
      }

      util.async.each(options, cb);
    }

    util.async.sequential([syncStoreChanges, syncDocumentChanges], cb);
  };

};
Replicator.prototype = new Replicator.__prototype__();


Replicator.StoreMergeStrategy = function() {

  function groupChangesByDoc(changes) {
    var result = {};
    _.each(changes, function(change) {
      var list = result[change.id] || [];
      list.push(change);
      result[change.id] = list;
    });
    return result;
  }

  this.hasConflict = function(mine, theirs) {
    if (!mine || !theirs) return false;

    function getState(changes) {
      var state = {};
      _.each(changes, function(change) {
        state[change.command[0]] = true;
      });
    }

    state = {
      mine: getState(mine),
      theirs: getState(theirs)
    };

    return state;
  }

  this.merge = function(changes) {
    var result = {
      mine: [],
      theirs: []
    };

    if (changes.mine.length == 0 || changes.theirs.length == 0) {
      result.mine = changes.theirs;
      result.theirs = changes.mine;
    } else {

      var grouped = {
        mine: groupChangesByDoc(changes.mine),
        theirs: groupChangesByDoc(changes.theirs)
      };

      var all = _.extend({}, grouped.mine, grouped.theirs);
      var conflicts = {};

      _.each(Object.keys(all), function(docId) {
        var conflict = this.hasConflict(grouped.mine.docId, grouped.theirs.docId);
        if (conflict) conflicts[docId] = conflict;
      }, this);

      if (_.isEmpty(conflicts)) {

        var myLast = _.last(changes.mine).id;
        var theirLast = _.last(changes.theirs).id;

        result.mine = changes.theirs.slice(0);
        result.theirs = changes.mine.slice(0);

        // Note: In contrast to git I want to have the index linear.
        // Without introducing a concept to rewrite, this leads to different
        // versions of the index regarding the order.
        // For now, this divergence tolerated.
        // TODO: allow to rewrite changes to solve this problem.

        var cid = util.uuid();

        // create a sequence of changes that can be applied onto mine
        // with the last change indicates the merge and is shared on both sides afterwards
        result.mine[0].parent = myLast;
        var myMerge = {id: cid, "command": ["merge", myLast], parent: theirLast};
        result.mine.push(myMerge);

        // create a sequence of changes that can be applied onto theirs
        result.theirs[0].parent = theirLast;
        var theirMerge = {id: cid, "command": ["merge", theirLast], parent: myLast};
        result.theirs.push(theirMerge);

      } else {
        throw new Error("Merging with conflicts is not implemented yet.");
      }
    }

    return result;
  };

};

Replicator.DocumentMergeStrategy = function() {

  this.merge = function(changes) {
    var result = {
      mine: [],
      theirs: []
    };

    // Fast-Forward
    if (changes.mine.length == 0 || changes.theirs.length == 0) {
      result.mine = changes.theirs;
      result.theirs = changes.mine;
    }
    // Non-Fast-Forward
    else {
      throw new Error("Non fast-forward merges are not yet supported");
    }

    return result;
  };

};

root.Substance.Replicator2 = Replicator;

}).call(this);
