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
    this.prefix = 'machine ' + this.model.id
    this.players = {}
    this.clients = []
    this.queue = new Queue()
}

Machine.forUser = function(type, userId, cb) {
    var self = this
    , machine = _.find(machines, function(m) {
        return m.model.get('owner') === userId && m.model.get('game') === type.name
    })

    if (machine) return cb(null, machine)

    debug(util.format('finding a machine of type %s for user %s', type.name, userId))

    // HACK: only way i know how to have it not use object id conversion
    var q = { owner: { $regex: userId } }
    services.db.get('machines').findOne(q, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb(null, null)
        var model = new type.model(doc, { parse: true })
        machine = machines[model.id] = new type(model, {
            callback: function() {
                cb(null, machine)
            }
        })
    })
}

Machine.findOrCreate = function(type, userId, cb) {
    Machine.forUser(type, userId, function(err, machine) {
        if (machine) debug('existing machine was found for user')
        if (err || machine) return cb(err, machine)
        var model = new type.model({
            owner: userId,
            type: type.name
        })
        machine = machines[model.id] = new type(model, {
            callback: function() {
                cb(null, jachine)
            }
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
    if (context) fn = _.bind(fn, context);
    client.socket.on(this.prefix + ':' + name, function(message) {
        self.queue(function(cb) {
            fn(client, message, cb);
        })
    })
}

module.exports = Machine
