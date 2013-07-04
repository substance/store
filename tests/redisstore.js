(function(root) {

var _ = root._;
var Substance = root.Substance;

if (!Substance.RedisStore) return;

var impl = {
  setup: function() {
    var settings = {
      scope: "test:redisstore"
    };
    var _store = new Substance.RedisStore(settings);
    _store.impl.clear();
    this.store = new Substance.AsyncStore(_store);
  }
};

_.each(root.Substance.test.store, function(testClass, name) {
  var test = new testClass(impl);
  root.Substance.registerTest(["Store", "RedisStore", name], test);
});

})(this);
