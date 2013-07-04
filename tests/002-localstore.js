(function(root) {

var Substance = root.Substance;

if (!Substance.LocalStore) return;

var impl = {
  setup: function() {
    this.store = new Substance.LocalStore("test:localstore");
    this.store.clear();
  }
};

var test = new root.Substance.test.StoreTest(impl);
root.Substance.registerTest(["Store", "LocalStore"], test);

})(this);
