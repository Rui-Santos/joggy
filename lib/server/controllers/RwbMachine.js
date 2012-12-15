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
    this.name = 'Red, White & Blue'
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

RwbMachine.prototype.onClientSpin = function(client, packet, cb) {
    var self = this

    debug('spin requested')

    var bet = +packet.bet

    if (!~[1, 2, 3].indexOf(+packet.bet)) return cb(new Error('invalid bet'))

    var reason = util.format('spin for %s credit on rwb machine %s', bet, self.model.id)

    client.user.wager(bet * 1e5, reason, function(err) {
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

        var symbols = _.map(stops, function(s, r) {
            return rwb.lookup(r, s)
        })

        var reverseSymbols = _.reduce(rwb.symbols, function(m, v, k) {
            m[v] = k
            return m
        }, {})

        debug(util.format('spin to %s, %s, %s', reverseSymbols[symbols[0]], reverseSymbols[symbols[1]],
            reverseSymbols[symbols[2]]))

        var credits = rwb.payout(symbols, bet, 'nice')

        debug('pays ' + credits + ' credits')

        self.broadcast('spin', { stops: stops, credits: credits })

        if (credits === 0) return cb()

        var reason = util.format('rwb spin to %s, %s, %s', reverseSymbols[symbols[0]], reverseSymbols[symbols[1]],
            reverseSymbols[symbols[2]])

        client.user.give(credits * 1e5, reason, function(err) {
            if (err) return cb(err)

            services.emit('win', {
                user: client.user,
                what: util.format(
                    '%s, %s, %s',
                    reverseSymbols[symbols[0]],
                    reverseSymbols[symbols[1]],
                    reverseSymbols[symbols[2]]
                ),
                credits: credits,
                machine: self
            })

            cb()
        })
    })
}

module.exports = RwbMachine
