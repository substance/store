(function(root) {

var Substance = root.Substance;

if (!Substance.RedisStore) return;

var impl = {
  setup: function() {
    var settings = {
      scope: "test:redisstore"
    };
    this.store = new Substance.RedisStore(settings);
    this.store.clear();
  }
};

var test = new root.Substance.test.StoreTest(impl);
root.Substance.registerTest(["Store", "RedisStore"], test);

})(this);
