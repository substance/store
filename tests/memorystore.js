(function(root) {

var _ = root._;
var Substance = root.Substance;

var impl = {
  setup: function() {
    this.store = new Substance.AsyncStore(new Substance.MemoryStore());
  }
};


_.each(root.Substance.test.store, function(testClass, name) {
  var test = new testClass(impl);
  root.Substance.registerTest(["Store", "MemoryStore", name], test);
});

})(this);
