
(function(root){ "use_strict";

var _,
    util,
    errors,
    Store,
    redis;

// Note: redis is inject by a native plugin
// if (typeof redis === "undefined") return;

// Native extension
if (typeof exports !== 'undefined') {
  _ = require('underscore');
  util = require('substance-util');
  errors = require('substance-util/errors');
  Store = require('./store');
  redis = require('../lib/redis');
  console.log()
} else {
  _ = root._;
  util = root.Substance.util;
  errors = root.Substance.errors;
  Store = root.Substance.Store;
  redis = root.redis;
}

var RedisStore = function(settings) {
  Store.call(this);

  var defaults = {
    host: "127.0.0.1",
    port: 6379,
    scope: "substance"
  };
  this.settings = _.extend(defaults, settings);

  this.redis = redis.RedisAccess.Create(0);
  this.redis.setHost(this.settings.host);
  this.redis.setPort(this.settings.port);

  // the scope is useful to keep parts of the redis db separated
  // e.g. tests would use its own, or one could separate user spaces
  this.redis.setScope(this.settings.scope);
  this.redis.connect();

  this.impl = new RedisStore.__impl__(this);
};

RedisStore.__impl__ = function(self) {

  this.hash = function() {
    var key = Store.defaultHashKey(arguments);
    return new RedisStore.Hash(self.redis, key);
  };

  this.sortedhash = function() {
    var key = Store.defaultHashKey(arguments);
    return new RedisStore.SortedHash(self.redis, key);
  };

  this.clear = function() {
    self.redis.removeWithPrefix("");
  };

  this.subStore = function(path) {
    var settings = _.clone(this.settings);
    settings.scope = settings.scope + ":" + path.join(":");
    return new RedisStore(settings);
  };

};
RedisStore.prototype = Store.prototype;

RedisStore.Hash = function(redis, scope) {
  this.redis = redis;
  this.scope = scope;
  this.hash = redis.asHash(scope);
};

RedisStore.Hash.__prototype__ = function() {

  this.contains = function(key) {
    return this.hash.contains(key);
  };

  this.keys = function() {
    return this.hash.getKeys();
  };

  this.set = function(key, value) {
    if (!key) throw new errors.StoreError("Illegal key:"+key);
    this.hash.set(key, value);
  };

  this.clear = function() {
    var keys = this.keys();
    _.each(keys, function(key) {
      this.delete(key);
    }, this);
  };

  this.delete = function(key) {
    this.hash.remove(key);
  };

  this.__get__ = function(key) {
    return this.hash.getJSON(key);
  };
};
RedisStore.Hash.__prototype__.prototype = new Store.AbstractHash();
RedisStore.Hash.prototype = new RedisStore.Hash.__prototype__();

RedisStore.SortedHash = function(redis, scope) {
  RedisStore.Hash.call(this, redis, scope);
  this.list = redis.asList(scope+":list");
};

RedisStore.SortedHash.__prototype__ = function() {

  var __super__ = util.prototype(this);

  this.keys = function() {
    return this.list.asArray();
  };

  this.set = function(key, value) {
    __super__.set.call(this, key, value);

    this.list.remove(key);
    if (value !== undefined) {
      this.list.addAsString(key);
    }
  };

  this.delete = function(key) {
    this.list.remove(key);
    this.hash.remove(key);
  };

};
RedisStore.SortedHash.__prototype__.prototype = RedisStore.Hash.prototype;
RedisStore.SortedHash.prototype = new RedisStore.SortedHash.__prototype__();

// Exports
if (typeof exports !== 'undefined') {
  module.exports = RedisStore;
} else {
  root.Substance.RedisStore = RedisStore;
}

})(this);
