(function(root) {

var assert = root.Substance.assert;
var _ = root._;

function StoreTest(impl) {
  _.extend(this, impl);

  this.actions = [

    "Create Hash", function() {
      this.hash = this.store.hash("hash1");
      assert.isArrayEqual([], this.hash.keys());
    },

    "Set", function() {
      this.hash.set("foo", "bar");

      assert.isEqual("bar", this.hash.get("foo"));
      assert.isTrue(this.hash.contains("foo"));
      assert.isArrayEqual(["foo"], this.hash.keys());
    },

    "Delete", function() {
      this.hash.delete("foo");

      assert.isFalse(this.hash.contains("foo"));
      assert.isArrayEqual([], this.hash.keys());
      assert.isUndefined(this.hash.get("foo"));
    },

    "Clear", function() {
      this.hash.set("a", 1);
      this.hash.set("b", 2);
      this.hash.set("c", 3);

      this.hash.clear();
      assert.isArrayEqual([], this.hash.keys());
      assert.isUndefined(this.hash.get("a"));
      assert.isUndefined(this.hash.get("b"));
      assert.isUndefined(this.hash.get("c"));
    },
  ];
}

if (!root.Substance.test) root.Substance.test = {};
root.Substance.test.StoreTest = StoreTest;

})(this);
