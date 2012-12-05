process.env.DEBUG || (process.env.DEBUG = '.*');

console.log('starting web app');

process.on('uncaughtException', function(err) {
    console.error('uncaught exception in process')
    console.error(err)
    console.error(err.stack)
})

var app = new (require('../lib/server/App'))(process.env.PORT || 4010);
