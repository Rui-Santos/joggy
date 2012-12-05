var express = require('express')
, _ = require('underscore')
, util = require('util')
, debug = require('debug')('joggy:app')
, Site = require('./controllers/Site')
, services = require('./services')

module.exports = function() {
    var app = express()
    , Session = require('connect').middleware.session.Session

    services.sessionStore = new express.session.MemoryStore()

    app.use(express.cookieParser())
    app.use(express.bodyParser())
    app.use(express.session({
        secret: services.config.session,
        store: services.sessionStore,
        // allow client to know if he has a session
        cookie: { httpOnly: false }
    }))

    require('./webapp.auth').configure(app)
    require('./webapp.assets').configure(app)

    return app
}