var debug = require('debug')('joggy:chat')
, _ = require('underscore')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, sanitizer = require('sanitizer')
, Chat = function() {
    this.clients = [];
    this.listeners = {};
};

util.inherits(Chat, EventEmitter);

Chat.prototype.addClient = function(client) {
    var self = this

    if (!client) throw new Error('client null')
    if (~self.clients.indexOf(client)) throw new Error('duplicate client')

    debug('adding client to the chat ' + client.socket.id)

    function clientChat(packet, callback) {
        if (!client.user) return callback && callback('not logged in');
        if (!_.isObject(packet)) throw new Error('packet not object');
        packet = _.pick(packet, 'message')
        if (!_.isString(packet.message) || !packet.message.length) throw new Error('bad text')
        packet.message = sanitizer.escape(packet.message)
        if (packet.message.match(/^\s*$/)) return callback && callback('empty message')

        self.broadcast(_.extend(packet, { from: client.user.model.get('username') }))
        self.emit('chat', _.extend({}, packet, { client: client }))
    }

    client.socket.on('chat', clientChat)

    this.listeners[client] = clientChat
    this.clients.push(client)

    if (client.user) {
        self.emit('join', client.user)
    }
}

Chat.prototype.removeClient = function(client) {
    if (!client) throw new Error('client null');
    if (!~this.clients.indexOf(client)) throw new Error('client not in chat');
    debug('removing client ' + client.socket.id);
    client.socket.removeListener('chat', this.listeners[client]);
    this.listeners[client] = null;
    this.clients.splice(this.clients.indexOf(client), 1);
}

Chat.prototype.broadcast = function(packet) {
    debug('broadcast: [' + (packet.from || 'system') + '] ' + packet.message)

    _.each(this.clients, function(client) {
        client.socket.emit('chat', packet)
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
