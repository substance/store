
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

  this.redis = redis.RedisAccess.Create(0);
  this.redis.setHost(settings.host);
  this.redis.setPort(settings.port);

  // the scope is useful to keep parts of the redis db separated
  // e.g. tests would use its own, or one could separate user spaces
  this.redis.setScope(settings.scope);
  this.redis.connect();

  this.impl = new RedisStore.__impl__(this);
}

RedisStore.__impl__ = function(self) {


  this.hash = function() {
    var key = Store.defaultHashKey(arguments);
    return new RedisStore.Hash(self.redis, key);
  };

  this.delete = function (id) {
    self.redis.removeWithPrefix("document:"+id);
  };

  this.clear = function() {
    // console.log("Clearing...");
    self.redis.removeWithPrefix("");
  };

};

RedisStore.prototype = Store.prototype;

RedisStore.Hash = function(redis, scope) {
  this.redis = redis;
  this.scope = scope;
};

RedisStore.Hash.prototype = _.extend(new Store.AbstractHash(), {

  scoped : function(key) {
    return this.scope+":"+key;
  },

  // efficient implementation
  contains : function(key) {
    return this.redis.exists(this.scoped(key));
  },

  __get__ : function(key) {
    return this.redis.getJSON(this.scoped(key));
  },

  __set__ : function(key, value) {
    if (value === undefined) {
      this.redis.remove(this.scoped(key));
    } else {
      this.redis.set(this.scoped(key), value);
    }
  }

});

// Exports
if (typeof exports !== 'undefined') {
  exports.RedisStore = RedisStore;
} else {
  root.RedisStore = RedisStore;
  root.Substance.RedisStore = RedisStore;
}

})(this);
