var http = require('http');
var express = require('express');
var TestSuite = require("substance-test/src/test_suite");

// Create Express Application
// --------

var app = express();

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

// Configure Test-Suite
// --------

var globalScripts = [
  { alias: "underscore.js", path: __dirname +"/node_modules/underscore/underscore.js" },
  { alias: "substance-util/utils.js", path: __dirname +"/node_modules/substance-util/util.js" },
  { alias: "substance-util/errors.js", path: __dirname +"/node_modules/substance-util/errors.js" },
  { alias: "substance-test/test.js", path: __dirname +"/node_modules/substance-test/test.js" },
  { alias: "substance-test/assert.js", path: __dirname +"/node_modules/substance-test/assert.js" },
  { alias: "substance-store/store.js", path: __dirname +"/src/store.js" },
  { alias: "substance-store/memory_store.js", path: __dirname +"/src/memory_store.js" },
  { alias: "substance-store/local_store.js", path: __dirname +"/src/local_store.js" }
];
var container = new TestSuite(app, "/", ["tests"], globalScripts);

// Start Serving
// --------


var port = app.get('port');
http.createServer(app).listen(port, function(){
  console.log("TestSuite running on port " + port)
  console.log("http://127.0.0.1:"+port+"/testsuite");
});
