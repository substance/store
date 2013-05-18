
(function(){

var root = this;

// Native extension
if (typeof exports !== 'undefined') {
  var util = require('../../util/util');
  var Store = require('./store').Store;
  var _ = require('underscore');
  var redis = require('../lib/redis');
} else {
  var util = root.Substance.util;
  var Store = root.Substance.Store;
  var _ = root._;
  var redis = root.redis;
}

var RedisStore = function(settings) {
  Store.call(this);

  var defaults = {
    host: "127.0.0.1",
    port: 6379,
    scope: "substance"
  };
  var settings = _.extend(defaults, settings);

  this.__redis__ = redis.RedisAccess.Create(0);
  this.__redis__.setHost(settings.host);
  this.__redis__.setPort(settings.port);

  // the scope is useful to keep parts of the redis db separated
  // e.g. tests would use its own, or one could separate user spaces
  this.__redis__.setScope(settings.scope);
  this.__redis__.connect();

  this.__impl__ = new RedisStore.__impl__(this);
}

RedisStore.__impl__ = function(self) {

  this.hash = function(type, id) {
    var key = type;
    if (id) key = key+":"+id;
    return new RedisStore.Hash(self.__redis__, key);
  };

  this.delete = function (id) {
    self.__redis__.removeWithPrefix("document:"+id);
  };

  this.clear = function() {
    self.__redis__.removeWithPrefix("");
  };
};

RedisStore.prototype = new Store.__prototype__();

RedisStore.Hash = function(__redis__, scope) {
  this.__redis__ = __redis__;
  this.scope = scope;
};

RedisStore.Hash.__prototype__ = function() {

  this.scoped = function(key) {
    return this.scope+":"+key;
  }

  // efficient implementation
  this.contains = function(key) {
    return this.__redis__.exists(this.scoped(key));
  }

  this.__get__ = function(key) {
    return this.__redis__.getJSON(this.scoped(key));
  };

  this.__set__ = function(key, value) {
    if (value === undefined) {
      this.__redis__.remove(this.scoped(key));
    } else {
      this.__redis__.set(this.scoped(key), value);
    }
  };
};
RedisStore.Hash.__prototype__.prototype = new Store.AbstractHash();
RedisStore.Hash.prototype = new RedisStore.Hash.__prototype__();

// Exports
if (typeof exports !== 'undefined') {
  exports.RedisStore = RedisStore;
} else {
  root.RedisStore = RedisStore;
  root.Substance.RedisStore = RedisStore;
}

})(this);
