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


root.Substance.Test.registerTest(["Store", "LocalStore"], test);

})(this);
