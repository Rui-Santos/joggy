var debug = require('debug')('joggy:chat')
, _ = require('underscore')
, util = require('util')
, services = require('../services')
, EventEmitter = require('events').EventEmitter
, sanitizer = require('sanitizer')
, Chat = function() {
    this.clients = [];
    this.users = []
    this.listeners = {};

    services.on('addClient', this.addClient.bind(this))
    services.on('removeClient', this.removeClient.bind(this))
};

util.inherits(Chat, EventEmitter);

Chat.prototype.addClient = function(client) {
    var self = this

    if (!client) throw new Error('client null')
    if (~self.clients.indexOf(client)) throw new Error('duplicate client')

    debug('adding client to the chat ' + client.socket.id)

    function clientChat(packet, callback) {
        if (!_.isObject(packet)) throw new Error('packet not object');
        packet = _.pick(packet, 'message')
        if (!_.isString(packet.message) || !packet.message.length) throw new Error('bad text')
        packet.message = packet.message.substr(0, 300)
        packet.message = sanitizer.escape(packet.message)
        if (packet.message.match(/^\s*$/)) return callback && callback('empty message')

        self.broadcast('chat', _.extend(packet, { from: client.user.model.get('username') }))
        self.emit('chat', _.extend({}, packet, { client: client }))
    }

    this.listeners[client] = clientChat
    this.clients.push(client)

    if (client.user) {
        client.socket.on('chat', clientChat)

        var existing = !!self.users.filter(function(u) { return u.model.id == client.user.model.id }).length

        if (existing) {
            client.socket.emit('chat:usercount', { users: self.users.length })
        } else {
            self.users.push(client.user)
            self.emit('join', client.user)
            self.broadcast('chat:usercount', { users: self.users.length })
        }
    } else {
        client.socket.emit('chat:usercount', { users: self.users.length })
    }
}

Chat.prototype.removeClient = function(client) {
    if (!client) throw new Error('client null');
    if (!~this.clients.indexOf(client)) throw new Error('client not in chat');
    debug('removing client ' + client.socket.id)
    client.socket.removeListener('chat', this.listeners[client])

    if (client.user) {
        var clientCount = this.users.filter(function(u) { return user.model.id == client.user.model.id }).length

        // user is disconnecting his last client
        if (clientCount === 1) {
            this.users.splice(this.users.indexOf(client.user), 1)
            self.emit('leave', client.user)
            self.broadcast('chat:usercount', { users: self.users.length })
        }
    }

    this.listeners[client] = null;
    this.clients.splice(this.clients.indexOf(client), 1)
}

Chat.prototype.broadcast = function(name, packet) {
    _.each(this.clients, function(client) {
        client.socket.emit(name, packet)
    })
}

Chat.prototype.private = function(packet) {
    debug('private: [' + (packet.from || 'system') + '] > ' + packet.to.model.get('username') + ':' + packet.message)

    var clients = _.where(this.clients, { user: packet.to })

    if (!clients.length) {
        return debug('warning, there is no user ' + packet.to.model.get('username') + ' to send pm to ')
    }

    _.each(clients, function(client) {
        client.socket.emit('chat', { message: packet.message, from: packet.from, 'private': true })
    })
}

module.exports = Chat
