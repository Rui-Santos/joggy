var App = require('./App');
require('crypto-browserify');
process.env.DEBUG = '.*';
module.exports = window.App = new App;
require('backbone').history.start();