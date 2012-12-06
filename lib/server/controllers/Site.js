var Client = require('./Client')
, User = require('./User')
, Jackpot = require('./Jackpot')
, Models = require('../../models')
, Chat = require('./Chat')
, Bitcoin = require('./Bitcoin')
, services = require('../services')
, debug = require('debug')('joggy:site')
, _ = require('underscore')
, Machine = require('./Machine')
, Sprinkles = require('./Sprinkles')

function Site(config) {
    var self = this

    console.log('config', config)

    self.clients = []
    services.site = self

    self.chat = new Chat()

    self.sprinkles = new Sprinkles()
}

Site.prototype.onBitcoinCredit = function(userId, satoshi) {
    debug('*** bitcoin credited not implemented ***')
}

Site.prototype.connectClient = function(socket) {
    var self = this
    , client = new Client(socket)

    debug('connecting client from socket ' + socket.id)

    self.clients.push(client)

    if (!socket.handshake.session || !socket.handshake.session.google) {
        self.chat.addClient(client)
        return
    }

    var google = socket.handshake.session.google

    debug('the socket is authenticated with google id ' + google)

    User.findOrCreate(google, function(err, user) {
        if (err) throw err
        client.setUser(user)

        debug('user found, ' + client.user.model.id)

        self.chat.addClient(client)

        debug('finding or creating machine for user as part of login')

        Machine.findOrCreate(client.user.model.id, function(err, machine) {
            if (err) throw err;
            machine.add(client)
        })
    })
}

module.exports = Site
