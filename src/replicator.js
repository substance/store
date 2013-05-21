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

    var lastLocal = this.local.getLastChange(trackId);
    var lastRemote;
    var localChanges;
    var remoteChanges;
    var merged;

    function getLastChange(cb) {
      self.remote.getLastChange(trackId, function(err, data) {
        lastRemote = data;
        cb(err);
      });
    }

    function getChanges(cb) {
      localChanges = self.local.getChanges(trackId, lastLocal, lastRemote) || [];
      self.remote.getChanges(trackId, lastRemote, lastLocal, function(err, data) {
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
            var options = change.command[2];
            if (options.commits) {
              options.commits = self.local.commits(docId, options.commits);
            }
          }
        });

        var options = {
          items: merged.mine,
          iterator: function(change, cb) {
            var cid = change.id;
            var cmd = change.command[0];
            var options = change.command[2];
            if (cmd != "update" || !options.commits) return cb(null);

            self.remote.commits(docId, options.commits, function(err, data) {
              if (data) options.commits = data;
              cb(err);
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

    util.async.sequential([getLastChange, getChanges, merge, fetchData, sync], cb);
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
      // documents have been created or deleted
      // content has to be exchanged
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
      });

      if (_.isEmpty(conflicts)) {
        // create an extra change
        var cid = util.uuid();
        var myLast = _.last(changes.mine).id;
        var theirLast = _.last(changes.theirs).id;
        var change = {id: cid, "command": ["merge", theirLast], parent: myLast};

        result.mine = changes.theirs.slice(0);
        result.theirs = changes.mine.slice(0);
        result.mine.push(change);
        result.theirs.push(change);
      } else {
        // TODO:
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
