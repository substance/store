(function(root) {



var Substance = root.Substance;

var impl = {
  setup: function() {
    this.store = new Substance.MemoryStore();
  }
};

var test = new root.Substance.test.StoreTest(impl);
root.Substance.Test.registerTest(["Store", "MemoryStore"], test);

})(this);
