
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

    // Initialization
    // --------
    Store.call(this);
    var proto = util.prototype(this);

    // reference to this for use within instance methods
    var self = this;

    var __redis__ = redis.RedisAccess.Create(0);

    var defaults = {
      host: "127.0.0.1",
      port: 6379,
      scope: "substance"
    };

    var settings = _.extend(defaults, settings);

    __redis__.setHost(settings.host);
    __redis__.setPort(settings.port);

    // the scope is useful to keep parts of the redis db separated
    // e.g. tests would use its own, or one could separate user spaces
    __redis__.setScope(settings.scope);
    __redis__.connect();

    proto.__hash__ = function(path) {
      var key = path.join(":");
      return new RedisStore.Hash(__redis__, key);
    }

    proto.__delete__ = function (id) {
      // TODO: maybe could improve, as the actual structure is not defined here
      __redis__.removeWithPrefix("document:"+id);
    }

    proto.__clear__ = function() {
      __redis__.removeWithPrefix("");
    }
  };

  RedisStore.Hash = function(__redis__, scope) {

    var proto = util.prototype(this);
    Store.AbstractHash.apply(this);

    function scoped(key) {
      return scope+":"+key;
    }

    // efficient implementation
    proto.contains = function(key) {
      return __redis__.exists(scoped(key));
    }

    proto.__get__ = function(key) {
      return __redis__.getJSON(scoped(key));
    };

    proto.__set__ = function(key, value) {
      if (value === undefined) {
        __redis__.remove(scoped(key));
      } else {
        __redis__.set(scoped(key), value);
      }
    };
  };

  // Exports
  if (typeof exports !== 'undefined') {
    exports.RedisStore = RedisStore;
  } else {
    root.RedisStore = RedisStore;
    root.Substance.RedisStore = RedisStore;
  }

})(this);
