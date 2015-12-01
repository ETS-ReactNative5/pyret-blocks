// *Some* environments (phantomjs) don't have es5 (Function.prototype.bind)
require('babel-polyfill');

// require all the files in the spec folder that end with -test.js
var context = require.context('.', false, /.*-test.js$/);
context.keys().forEach(context);
// require all the files in the parsers folder
context = require.context('./parsers', false, /.*-test.js$/);
context.keys().forEach(context);
