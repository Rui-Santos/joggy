var _ = require('underscore')
, util = require('util')
, Queue = require('../../Queue')
, Models = require('../../models')
, debug = require('debug')('joggy:machine')
, services = require('../services')
, Machine = require('./Machine')
, rwb = require('../../rwb')

function RwbMachine(model) {
    var self = this
    Machine.call(self, model)

    self.reset()
}

util.inherits(RwbMachine, Machine)

RwbMachine.name = 'rwb'
RwbMachine.model = Models.RwbMachine

RwbMachine.prototype.reset = function(cb) {
    var self = this

    debug('resetting');

    self.save(function(err) {
        if (err) console.error('failed to save machine during reset', err)
        cb && cb()
    })
},

RwbMachine.prototype.add = function(client) {
    this.clients.push(client);

    client.socket.emit('join', _.pick(
        this.model.toJSON(),
        '_id', 'game', 'stops'
    ))

    this.subscribe(client, 'spin', this.onClientSpin, this)
},

RwbMachine.prototype.onClientSpin = function(client, message, cb) {
    var self = this

    client.user.wager(1 * 1e5, function(err) {
        if (err) {
            console.error(err)
            debug('failed to wager')
            return cb()
        }

        for (var i = 0; i < self.model.get('length').stops; i++) {
            self.model.get('stops')[i] = rwb.stops[i][Math.floor(Math.random() * rwb.reels[i].length)]
        }

        self.save(function(err) {
            if (err) console.error('failed to save machine after spin', err)
            self.broadcast('spin', { reels: self.model.get('reels').toJSON() })
            debug('spin')
            cb()
        })
    })
}

module.exports = RwbMachine
