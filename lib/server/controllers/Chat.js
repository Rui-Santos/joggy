var debug = require('debug')('joggy:chat')
, _ = require('underscore')
, util = require('util')
, services = require('../services')
, EventEmitter = require('events').EventEmitter
, sanitizer = require('sanitizer')
, Chat = function() {
    this.userCount = 0
    this.listeners = {}

    services.on('addClient', this.addClient.bind(this))
    services.on('removeClient', this.removeClient.bind(this))
};

util.inherits(Chat, EventEmitter);

Chat.prototype.clientChat = function(client, packet, callback) {
    if (!_.isObject(packet)) throw new Error('packet not object');
    packet = _.pick(packet, 'message')
    if (!_.isString(packet.message) || !packet.message.length) throw new Error('bad text')
    packet.message = packet.message.substr(0, 300)
    packet.message = sanitizer.escape(packet.message)
    if (packet.message.match(/^\s*$/)) return callback && callback('empty message')

    this.broadcast('chat', _.extend(packet, { from: client.user.model.get('username') }))
    this.emit('chat', _.extend({}, packet, { client: client }))
}

Chat.prototype.users = function() {
    return _.chain(services.site.clients)
        .filter(function(c) {
            return c.user
        })
        .map(function(c) {
            return c.user
        })
        .uniq()
        .value()
}

Chat.prototype.addClient = function(client) {
    if (!client.user) {
        client.socket.emit('chat:usercount', { users: this.userCount })
        return
    }

    var listener = this.listeners[client.socket.id] = this.clientChat.bind(this, client)
    client.socket.on('chat', listener)

    var newUserCount = this.users().length

    debug('adding client, new user count ' + newUserCount + ' (was ' + this.userCount + ')')

    if (newUserCount === this.userCount) {
        client.socket.emit('chat:usercount', { users: this.userCount })
        return
    }

    this.userCount = newUserCount
    this.emit('join', client.user, client)
    this.broadcast('chat:usercount', { users: this.userCount })
}

Chat.prototype.removeClient = function(client) {
    if (!client.user) {
        return
    }

    client.socket.removeListener('chat', this.listeners[client.socket.id]);
    delete this.listeners[client.socket.id]

    var newUserCount = this.users().length

    debug('removing client, new user count ' + newUserCount + ' (was ' + this.userCount + ')')

    if (newUserCount === this.userCount) {
        return
    }

    this.userCount = newUserCount
    this.emit('leave', client.user)
    this.broadcast('chat:usercount', { users: this.userCount })
}

Chat.prototype.broadcast = function(name, packet) {
    _.each(services.site.clients, function(client) {
        client.socket.emit(name, packet)
    })
}

Chat.prototype.private = function(packet) {
    debug(util.format('private: [%s] > [%s]: %s', packet.from || 'system', packet.to.model.get('username'), packet.message))

    var clients = _.where(services.site.clients, { user: packet.to })

    if (!clients.length) {
        debug(util.format('warning, there is no user %s to receive the pm', packet.to.model.get('username')))
        return
    }

    _.each(clients, function(client) {
        client.socket.emit('chat', { message: packet.message, from: packet.from, 'private': true })
    })
}

module.exports = Chat
