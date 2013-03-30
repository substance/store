(function(ctx){

  var LocalStore = function(options) {
    var that = this;
    var store = options.store;
    var appSettings = options.appSettings;
    var key = appSettings.get('user')+":deleted-documents";
    var deletedDocuments = appSettings.db.asHash(key);

    // Delegate
    var methods = _.keys(store);
    _.each(methods, function(methodName) {
      var method = store[methodName];
      if (typeof method === "function") {
        that[methodName] = method;
      }
    });

    function markAsDeleted(id) {
      deletedDocuments.set(id, id);
      return true;
    }

    this.delete = function(id, cb) {
      if (store.delete(id)) {
        markAsDeleted(id);
        cb(null);
        return true;
      }
      cb('deletion-failed');
      return false;
    };

    this.deletedDocuments = function() {
      return deletedDocuments.getKeys();
    };

    this.confirmDeletion = function(id) {
      return deletedDocuments.remove(id);
    };

    this.seed = function(data, cb) {
      // TODO: check if the provided data is valid
      if (!data['store'] || !data['settings'] || !data['deleted']) {
        return cb("Error: data is incompatible for seeding local doc store.");
      }

      _.each(data['store'], function(doc, id) {
        store.exists(id, function(err, exists) {
          if (err) return cb(err);

          function add(err) {
            if (err) return cb(err);
            // first create the doc
            store.create(id, function(err) {
              if (err) return cb(err);
              // then update everything
              store.updateMeta(doc.id, doc.commits, doc.meta, doc.refs, cb)
            })
          }

          if (exists) {
            store.delete(id, add);
          } else {
            add(null, doc);
          }
        });
      });
    };

    this.dump = function(cb) {
      // TODO: how to dump settings?
      var settings = {}
      var deletedDocs = []

      var docs = {};
      var docInfos = store.list();

      _.each(docInfos, function(info, idx, docInfos) {
        docs[info.id] = store.get(info.id);
      });

      _.each(deletedDocs.getKeys(), function(id, index, keys) {
        deletedDocs.push(id);
      });

      _.each(appSettings.getKeys(), function(value, key, keys) {
        settings[key] = value;
      });

       var dump = {
        'store': docs,
        'settings': settings,
        'deleted': deletedDocs
      };

      cb(null, dump);
    };

    this.clear = function(cb) {
      store.clear(function(err) {
        if (err) return cb(err);
        _.each(appSettings.getKeys(), function(key) {
          appSettings.remove(key);
        });
        _.each(deletedDocuments.getKeys(), function(key) {
          deletedDocuments.remove(key);
        });
        return cb(null);
      });
    }
  }

  // Exports
  if (typeof exports !== 'undefined') {
    exports.LocalStore = LocalStore;
  } else {
    if (!ctx.Substance) ctx.Substance = {};
    ctx.Substance.LocalStore = LocalStore;
  }
})(this);