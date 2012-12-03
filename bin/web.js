process.env.DEBUG || (process.env.DEBUG = '.*');

console.log('starting web app');

var app = new (require('../lib/server/App'))(process.env.PORT || 4010);
