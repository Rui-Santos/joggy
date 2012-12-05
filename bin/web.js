var monk = require('monk')
, http = require('http')
, debug = require('debug')('joggy:web')
, services = require('../lib/server/services')
, Site = require('../lib/server/controllers/Site')

process.env.DEBUG || (process.env.DEBUG = '.*');

process.on('uncaughtException', function(err) {
    console.error('uncaught exception in process')
    console.error(err)
    console.error(err.stack)
})

services.config = require('../config')
services.db = monk(services.config.db)
services.sync = require('../lib/server/app.db.sync')
services.bitcoin = new (require('../lib/server/controllers/bitcoin'))()

services.site = new Site()

var webapp = require('../lib/server/webapp')()
, listener = http.createServer(webapp)
, socketapp = require('../lib/server/socketapp')(listener)

socketapp.on('connection', services.site.connectClient.bind(services.site))

var port = process.env.PORT || services.config.port
debug('listening in port ' + port)

listener.listen(port)
