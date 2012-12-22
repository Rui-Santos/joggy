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
, RwbMachine = require('./RwbMachine')
, Machine = require('./Machine')
, Kitty = require('./Kitty')
, Admin = require('./Admin')

function Site(config) {
    var self = this

    self.clients = []
    services.site = self

    self.chat = new Chat()

    self.sprinkles = new Sprinkles()
    self.kitty = new Kitty()
    self.admin = new Admin()

    //self.queueNextCompetition()

    // start contest in 30 sec
    setTimeout(this.startCompetition.bind(this), 30 * 1000)
}

Site.prototype.queueNextCompetition = function() {
    var variance = 8 * 60 * 1000
    , interval = 10 * 60 * 1000
    interval = interval + Math.random() * variance * 2 - variance
    this.competitionTimer = setTimeout(this.startCompetition.bind(this), interval)
    debug('next competition will be in ' + (interval / 1000) + ' seconds')
}

Site.prototype.startCompetition = function() {
    var self = this
    , types = ['sprinkles', 'kitty', 'kitty']
    , type = types[Math.floor(Math.random() * types.length)]

    debug('will start competition of type ' + type)

    if (type === 'sprinkles') {
        self.sprinkles.startCompetition(this.competitionEnded.bind(this))
    } else if (type === 'kitty') {
        self.kitty.startCompetition(this.competitionEnded.bind(this))
    } else {
        throw new Error('unknown competition type ' + type)
    }
}

Site.prototype.competitionEnded = function() {
    this.queueNextCompetition()
}

Site.prototype.onClientJoin = function(client, packet) {
    var type

    if (!packet.game) return client.socket.emit('error', { message: 'joining specific machines not implemented' })

    if (packet.game === 'job') type = JobMachine
    else if (packet.game === 'rwb') type = RwbMachine
    else return client.socket.emit('error', { message: 'no such game' })

    Machine.findOrCreate(type, client.user.model.id, function(err, machine) {
        if (err) {
            console.error('failed to make machine ' + packet.game + ' for user ' + client.user.model.id)
            console.error(err)
            return client.socket.emit('error', { message: 'failed to make machine' })
        }

        if (!machine) throw new Error('machine could not be created')
        if (!machine.model) throw new Error('machine model missing from ' + util.inspect(_.keys(machine)))

        debug(util.format(
            'adding client %s to the machine %s (%s)',
            client.user.model.id,
            machine.model.id,
            machine.model.get('game')
        ))

        machine.add(client)
    })
}

Site.prototype.onClientDisconnect = function(client) {
    debug('removing disconnected client ' + client.socket.id)
    this.clients.splice(this.clients.indexOf(client), 1)
    services.emit('removeClient', client)
    debug('client removed. clients=' + this.clients.length)
}

Site.prototype.connectClient = function(socket) {
    var self = this
    , client = new Client(socket)

    debug('connecting client from socket ' + socket.id)

    self.clients.push(client)

    debug('client count is ' + self.clients.length)

    client.socket.on('disconnect', this.onClientDisconnect.bind(this, client))

    if (!socket.handshake.session || !socket.handshake.session.google) {
        socket.emit('guest', {})
        services.emit('addClient', client)
        return
    }

    var google = socket.handshake.session.google

    debug('the socket is authenticated with google id ' + google)

    User.findOrCreate(google, function(err, user) {
        if (err) throw err
        client.setUser(user)
        debug('user found, ' + client.user.model.id)
        services.emit('addClient', client)
        socket.on('join', function(packet) { self.onClientJoin(client, packet) }.bind(self))
    })
}

module.exports = Site
