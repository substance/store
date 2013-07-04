(function(root) {

var _ = root._;
var Substance = root.Substance;

if (!Substance.LocalStore) return;

var impl = {
  setup: function() {
    var _store = new Substance.LocalStore("test:localstore");
    _store.impl.clear();
    this.store = new Substance.AsyncStore(_store);
  }
};

_.each(root.Substance.test.store, function(testClass, name) {
  var test = new testClass(impl);
  root.Substance.registerTest(["Store", "LocalStore", name], test);
});

})(this);
