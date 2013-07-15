(function(root) {

var Substance = root.Substance;

if (!Substance.LocalStore) return;

var test = {
  setup: function() {
    this.store = new Substance.LocalStore("test:localstore");
    this.store.clear();
  },
  actions: []
};

var test = new root.Substance.test.StoreTest(impl);
root.Substance.Test.registerTest(["Store", "LocalStore"], test);

})(this);
