(function(root) {

var Substance = root.Substance;

var impl = {
  setup: function() {
    this.store = new Substance.MemoryStore();
  }
};

var test = new root.Substance.test.StoreTest(impl);
root.Substance.registerTest(["Store", "MemoryStore"], test);

})(this);
