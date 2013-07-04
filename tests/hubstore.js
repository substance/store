(function(root) {

var _ = root._;

var impl = {
  setup: function(cb) {
    var self = this;
    this.store = this.session.remoteStore;
    this.session.client.seed("boilerplate", function(err) {
      if(err) return cb(err);
      self.session.authenticate("oliver", "abcd", cb);
    });
  }
};

_.each(root.Substance.test.store, function(testClass, name) {
  var test = new testClass(impl);
  root.Substance.registerTest(["Store", "HubStore", name], test);
});

})(this);
