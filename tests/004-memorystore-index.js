(function(root) {

var Substance = root.Substance;

var impl = {
  setup: function() {
    this.store = new Substance.MemoryStore();
  }
};

var test = new Substance.test.PersistentIndexTest(impl);
Substance.registerTest(["Store", "PersistentIndex", "MemoryStore"], test);

})(this);
