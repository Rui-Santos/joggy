var io = require('socket.io')
, services = require('./services')
, debug = require('debug')('joggy:socketapp')
, _ = require('underscore')

module.exports = function(listener) {
    var socket = io.listen(listener, _.extend(services.config.io, { 'log level': 1 }))

    // https://github.com/LearnBoost/socket.io/wiki/Authorizing
    // https://github.com/LearnBoost/socket.io/issues/545
    function authorization(data, cb) {
        if (!data.headers.cookie) {
            debug('the user has no cookie. authorization is granted as anonymous guest')
            return cb(null, true)
        }

        var signedCookies = require('cookie').parse(data.headers.cookie)
        data.cookies = require('connect/lib/utils').parseSignedCookies(signedCookies, services.config.session)

        var sid = data.cookies['connect.sid']

        debug('looking for session ' + sid)

        services.sessionStore.get(sid, function(err, session) {
            if (err) {
                debug('auth fail ' + err.message)
                return cb('internal error', false)
            }

            if (!session) return cb(null, false)

            data.session = session
            cb(null, true)
        })
    }

    socket.set('authorization', authorization)

    return socket
}