(function(root) {

var Substance = root.Substance;

if (!Substance.MemoryStore) return;

var test = {
  setup: function() {
    this.store = new Substance.MemoryStore();
    this.store.clear();
  },
  actions: []
};

root.Substance.Test.registerTest(["Store", "MemoryStore"], test);

})(this);
