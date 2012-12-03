var debug = require('debug')('joggy:chat')
, _ = require('underscore')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, Chat = function() {
    this.clients = [];
    this.listeners = {};
};

util.inherits(Chat, EventEmitter);

_.extend(Chat.prototype, {
    addClient: function(client) {
        if (!client) throw new Error('client null');
        if (~this.clients.indexOf(client)) throw new Error('duplicate client');

        debug('adding client ' + client.socket.id);

        var listener = _.bind(function(message, callback) {
            if (!client.user) return callback && callback('not logged in');
            if (!_.isObject(message)) throw new Error('message not object');
            message = _.pick(message, 'text');
            if (!_.isString(message.text) || !message.text.length) throw new Error('bad text');

            this.emit('chat', _.extend(message, { client: client }));
        }, this);

        client.socket.on('chat', listener);

        this.listeners[client] = listener;
        this.clients.push(client);
    },

    removeClient: function(client) {
        if (!client) throw new Error('client null');
        if (!~this.clients.indexOf(client)) throw new Error('client not in chat');
        debug('removing client ' + client.socket.id);
        client.socket.removeListener('chat', this.listeners[client]);
        this.listeners[client] = null;
        this.clients.splice(this.clients.indexOf(client), 1);
    },

    broadcast: function(message) {
        debug('broadcast: [' + (message.user || 'system') + '] ' + message.text);

        _.each(this.clients, function(client) {
            client.socket.emit('chat', message);
        });
    }
});

module.exports = new Chat;