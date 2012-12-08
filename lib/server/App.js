var express = require('express')
, _ = require('underscore')
, util = require('util')
, config = require('../../config')
, debug = require('debug')('joggy:app')
, Site = require('./controllers/Site')

var App = module.exports = function() {
    var self = this;

    self.app = express();
    self.site = new Site()

    var sessionStore = new express.session.MemoryStore()
    var Session = require('connect').middleware.session.Session;

    self.app.use(express.cookieParser());
    self.app.use(express.bodyParser());
    self.app.use(express.session({
        secret: config.session,
        store: sessionStore,
        // allow client to know if he has a session
        cookie: { httpOnly: false }
    }));

    require('./app.auth').configure(self.app)

    self.server = require('http').createServer(self.app);

    debug('http server listening on ' + port);

    self.server.listen(port);

    services.bitcoin = new Bitcoin(config.BTC)

    self.socket = require('./app.io').configure(self.server);

    // https://github.com/LearnBoost/socket.io/wiki/Authorizing
    // https://github.com/LearnBoost/socket.io/issues/545
    self.socket.configure(function() {
        self.socket.set('authorization', function(data, cb) {
            if (!data.headers.cookie) return cb(null, true)
            var signedCookies = require('cookie').parse(data.headers.cookie)
            data.cookies = require('connect/lib/utils').parseSignedCookies(signedCookies, config.session)
            var sid = data.cookies['connect.sid']
            debug('looking for session ' + sid)
            sessionStore.get(sid, function(err, session) {
                if (err) {
                    debug('auth fail ' + err.message)
                    return cb('internal error', false)
                }

                if (!session) return cb(null, false)

                data.session = session
                cb(null, true)
            })
        })
    })

    self.socket.on('connection', self.onSocketConnection.bind(self))

    require('./app.assets').configure(this.app);
}

_.extend(App.prototype, {
    onSocketConnection: function(socket) {
        this.site.connectClient(socket)
    }
})