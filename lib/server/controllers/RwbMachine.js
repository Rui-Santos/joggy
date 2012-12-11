var _ = require('underscore')
, util = require('util')
, Queue = require('../../Queue')
, Models = require('../../models')
, debug = require('debug')('joggy:machine:rwb')
, services = require('../services')
, Machine = require('./Machine')
, rwb = require('../../rwb')

function RwbMachine(model, options) {
    Machine.apply(this, arguments)
    this.reset(options.callback)
}

util.inherits(RwbMachine, Machine)

RwbMachine.game = 'rwb'
RwbMachine.model = Models.RwbMachine

RwbMachine.prototype.reset = function(cb) {
    cb && cb(null, this)
},

RwbMachine.prototype.add = function(client) {
    Machine.prototype.add.call(this, client)

    client.socket.emit('join', _.pick(
        this.model.toJSON(),
        '_id', 'game'
    ))

    this.subscribe(client, 'spin', this.onClientSpin.bind(this))
},

RwbMachine.prototype.onClientSpin = function(client, message, cb) {
    var self = this

    debug('spin requested')

    client.user.wager(1 * 1e5, function(err) {
        if (err) {
            console.error(err)
            debug('failed to wager')
            return cb()
        }

        var stops = []

        for (var i = 0; i < rwb.lookups.length; i++) {
            var len = rwb.lookups[i].length
            stops.push(Math.floor(Math.random() * len))
        }

        self.broadcast('spin', { stops: stops })

        var symbols = _.map(stops, function(s, r) {
            return rwb.lookup(r, s)
        })

        var reverseSymbols = _.reduce(rwb.symbols, function(m, v, k) {
            m[v] = k
            return m
        }, {})

        debug(util.format('spin to %s, %s, %s', reverseSymbols[symbols[0]], reverseSymbols[symbols[1]],
            reverseSymbols[symbols[2]]))

        var payout = rwb.payout(symbols, 1, 'nice')

        debug('pays ' + payout + ' credits')

        if (payout === 0) return cb()

        client.user.give(payout * 1e5, cb)
    })
}

module.exports = RwbMachine
