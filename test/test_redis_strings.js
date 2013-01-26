redis = require('../lib/redis')

var db = redis.RedisAccess.Create(0);
db.connect();
db.setScope("test_strings");

var testData = {
  ascii: {
    key: "ascii",
    str: "teststring"
  },
  unicode: {
    key: "unicode",
    str: "olé! ––– \u00A0"
  },
  null_: {
    key: "null",
    str: null
  },
  undefined_: {
    key: "undefined",
    str: undefined
  }
};

var data = testData.ascii;
db.setString(data.key, data.str);
if (data.str !== db.get(data.key)) {
  throw "Test failed: " + data.key;
}

data = testData.unicode;
db.setString(data.key, data.str);
if (data.str !== db.get(data.key)) {
  throw "Test failed: "  + data.key;
}

// should throw if null is provided as string
data = testData.null_;
try {
  db.setString(data.key, data.str);
  throw "Test failed: "  + data.key;
} catch (err) {
}

// should throw if undefined is provided as string
data = testData.undefined_;
try {
  db.setString(data.key, data.str);
  throw "Test failed: "  + data.key;
} catch (err) {
}

console.log("Ok.");
