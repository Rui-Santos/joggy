var _ = require('underscore')
, Queue = require('../../Queue')
, Models = require('../../models')
, util = require('util')
, crypto = require('crypto')
, debug = require('debug')('joggy:machine')
, Jackpot = require('./Jackpot')
, services = require('../services')
, machines = {}

function Machine(model, options) {
    this.options = options
    this.model = model;
    this.model.sync = services.sync
    if (!this.model.id) throw new Error('cannot construct machine with unsaved model')
    this.prefix = 'machine ' + this.model.id
    this.players = {}
    this.clients = []
    this.queue = new Queue()
}

Machine.forUser = function(type, userId, cb) {
    if (!type) throw new Error('type missing')

    var self = this
    , machine = _.find(machines, function(m) {
        return m.model.get('owner') === userId && m.model.get('game') === type.game
    })

    if (machine) return cb(null, machine)

    debug(util.format('finding a machine of type %s for user %s', type.game, userId))

    // HACK: only way i know how to have it not use object id conversion
    var q = { owner: { $regex: userId }, game: type.game }
    services.db.get('machines').findOne(q, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb()

        var model = new (type.model)(doc, { parse: true })
        debug('machine model restored, ' + model.cid)

        machine = machines[model.id] = new type(model, {
            callback: cb
        })
    })
}

Machine.findOrCreate = function(type, userId, cb) {
    debug('finding or creating a machine of type ' + type.game + ' for ' + userId)

    Machine.forUser(type, userId, function(err, machine) {
        if (err) {
            if (cb) return cb(err)
            throw err
        }

        if (machine) {
            debug('existing machine was found, no need to create')
            return cb(null, machine)
        }

        debug('no machine was found, making one')

        var model = new type.model({
            owner: userId,
            game: type.game
        })
        model.sync = require('../app.db.sync')

        model.save({
            success: function() {
                debug('machine created')
                machine = machines[model.id] = new type(model, {
                    callback: cb
                })
            },
            error: cb
        })
    })
}

Machine.prototype.save = function(cb) {
    this.model.save({}, {
        success: function() {
            cb()
        },
        error: cb
    })
}

Machine.prototype.broadcast = function(name, message) {
    _.each(this.clients, function(client) {
        this.send(client, name, message);
    }, this);
}

Machine.prototype.send = function(client, name, message) {
    client.socket.emit(this.prefix + ':' + name, message);
},

Machine.prototype.subscribe = function(client, name, fn, context) {
    var self = this
    if (!self.prefix) throw new Error('prefix not set')
    if (context) fn = _.bind(fn, context);
    debug('subscribing to ' + name + ' on machine:' + self.prefix)
    client.socket.on(self.prefix + ':' + name, function(message) {
        debug('queueing message on ' + self.prefix + ':' + name + util.inspect(message))
        self.queue(function(cb) {
            debug('--- ' + self.model.id + ' --- POP ----------')

            fn(client, message, function() {
                debug('--- ' + self.model.id + ' --- DRAIN --------------')
                cb()
            });
        })
    })
}

module.exports = Machine
