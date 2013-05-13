
(function(){

  var root = this;

  // Native extension
  if (typeof exports !== 'undefined') {
    var util = require('../../util/util');
    var errors = require('../../util/errors');
    var Store = require('./store').Store;
    var _ = require('underscore');
    var redis = require('../lib/redis');
  } else {
    var util = root.Substance.util;
    var errors = root.Substance.errors;
    var Store = root.Substance.Store;
    var _ = root._;
    var redis = root.redis;
  }

  var Hash = function(hash) {

    this.contains = function(key) {
      return hash.contains(key);
    };

    this.get = function(key) {
      if (arguments.length == 0) {
        var result = {};
        _.each(hash.getKeys(), function(key) {
          result[key] = hash.getJSON(key);
        });
        return result;
      }
      return hash.getJSON(key);
    };

    this.set = function(key, value) {
      hash.set(key, value);
    };

    this.keys = function() {
      return hash.getKeys();
    };

    this.delete = function(key) {
      hash.remove(key);
    };
  };

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

    var documents = __redis__.asHash("documents");
    var deletedDocuments = __redis__.asHash("deleted-documents");

    proto.__list__ = function () {
      return documents.getKeys();;
    }

    proto.__init__ = function (id) {
      var doc = {
        meta: {},
        refs: {}
      };
      documents.set(id, doc);
    }

    proto.__delete__ = function (id) {
      documents.remove(id);
      __redis__.removeWithPrefix("documents:"+id);
    }

    proto.__deletedDocuments__ = function () {
      return new Hash(deletedDocuments);
    }

    proto.__exists__ = function (id) {
      return documents.contains(id);
    }

    proto.__meta__ = function (id) {
      return new Hash(__redis__.asHash("documents:"+id+":meta"));
    }

    proto.__refs__ = function (id) {
      var hash = __redis__.asHash("documents:"+id+":refs");
      return new Hash(hash);
    }

    proto.__commits__ = function (id) {
      return new Hash(__redis__.asHash("documents:"+id+":commits"));
    }

    proto.__blobs__ = function(id) {
      return new Hash(__redis__.asHash("documents:"+id+":blobs"));
    }

    proto.__clear__ = function() {
      __redis__.removeWithPrefix("");
    }
  };

  // Exports
  if (typeof exports !== 'undefined') {
    exports.RedisStore = RedisStore;
  } else {
    root.RedisStore = RedisStore;
    root.Substance.RedisStore = RedisStore;
  }

})(this);
