var Client = require('./Client')
, User = require('./User')
, Jackpot = require('./Jackpot')
, Models = require('../../models')
, Chat = require('./Chat')
, Bitcoin = require('./Bitcoin')
, util = require('util')
, services = require('../services')
, debug = require('debug')('joggy:site')
, _ = require('underscore')
, Sprinkles = require('./Sprinkles')
, JobMachine = require('./JobMachine')
, Machine = require('./Machine')

function Site(config) {
    var self = this

    console.log('config', config)

    self.clients = []
    services.site = self

    self.chat = new Chat()

    self.sprinkles = new Sprinkles()
}

Site.prototype.onClientJoin = function(client, packet) {
    var type

    if (!packet.game) return client.socket.emit('error', { message: 'joining specific machines not implemented' })

    if (packet.game === 'job') type = JobMachine
    else return client.socket.emit('error', { message: 'no such game' })

    Machine.findOrCreate(type, client.user.model.id, function(err, machine) {
        if (err) {
            console.error('failed to make machine ' + packet.game + ' for user ' + client.user.model.id)
            console.error(err)
            return client.socket.emit('error', { message: 'failed to make machine' })
        }

        if (!machine) throw new Error('machine could not be created')

        debug(util.format(
            'adding client %s to the machine %s (%s)',
            client.user.model.id,
            machine.model.id,
            machine.model.get('game')
        ))

        machine.add(client)
    })
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

        socket.on('join', function(packet) { self.onClientJoin(client, packet) }.bind(self))
    })
}

module.exports = Site
