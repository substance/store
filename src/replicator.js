(function(root) { "use_strict";

var _,
    util,
    errors,
    Store;

if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('../../util/util');
  errors = require('../../util/errors');
  Store = require('./store').Store;
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
}

// var ReplicationError = errors.define("ReplicationError", 510);

var Replicator = function(local, remote, remoteID) {

  // a synchronous store, typically the localStore
  this.local = local;
  this.remote = remote;
  this.remoteID = remoteID;

};

Replicator.__prototype__ = function() {

  this.sync = function(cb) {
    /*
      TODO: re-implement replication on the basis of Chronicle.Index
      1. fetch changes
      2. merge
      3. push changes
    */
    cb("Not implemented yet.");
  };

};
Replicator.prototype = new Replicator.__prototype__();

root.Substance.Replicator = Replicator;

})(this);
