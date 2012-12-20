var _ = require('underscore')
, util = require('util')
, Queue = require('../../Queue')
, Models = require('../../models')
, debug = require('debug')('joggy:machine:rwb')
, services = require('../services')
, Machine = require('./Machine')
, rwb = require('../../rwb')
, Jackpot = require('./Jackpot')
, resetDelay = 2500

function RwbMachine(model, options) {
    var self = this
    Machine.apply(this, arguments)

    this.name = 'Red, White & Blue'

    Jackpot.find('rwb', function(err, jackpot) {
        if (err) return options.callback(err)
        if (!jackpot) return options.callback(new Error('jackpot not found'))
        self.jackpot = jackpot
        self.jackpot.model.on('change:current', self.onJackpotChange.bind(self))
        self.reset(options.callback)
    })
}

util.inherits(RwbMachine, Machine)

RwbMachine.game = 'rwb'
RwbMachine.model = Models.RwbMachine

RwbMachine.prototype.onJackpotChange = function() {
    if (!this.jackpot) {
        throw new Error('jackpot changed, but there is no jackpot for machine ' + this.model.id)
    }

    this.broadcast('jackpot', { current: this.jackpot.model.get('current') })
}

RwbMachine.prototype.reset = function(cb) {
    cb && cb(null, this)
}

RwbMachine.prototype.add = function(client) {
    Machine.prototype.add.call(this, client)

    client.socket.emit('join', _.pick(
        this.model.toJSON(),
        '_id', 'game'
    ))

    if (this.jackpot) {
        debug('sending the jackpot value to the new user')
        this.send(client, 'jackpot', { current: this.jackpot.model.get('current') })
    }

    this.subscribe(client, 'spin', this.onClientSpin.bind(this))
}

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

        if (self.jackpot) {
            debug('should contribute to the jackpot')

            var rate = 0.01
            , amount = bet * rate * 1e5

            self.jackpot.contribute(amount)
        } else {
            debug('the game has no jackpot, not contributing')
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

        if (bet === 3 &&
            symbols[0] === rwb.symbols['red seven'] &&
            symbols[1] === rwb.symbols['white seven'] &&
            symbols[2] === rwb.symbols['blue seven']) {
            debug('bet is 3 and symbols are red 7, white 7, blue 7')

            return self.jackpot.pay(client.user, function(err, jp) {
                if (err) {
                    console.error('failed to pay jackpot', err)
                    return cb()
                }

                self.broadcast('spin', { stops: stops, credits: Math.floor(jp / 1e5) })

                services.emit('jackpotWon', client.user, jp)

                setTimeout(function() {
                    self.reset(cb)
                }, resetDelay)
            })
        }

        var credits = rwb.payout(symbols, bet, 'nice')

        debug('pays ' + credits + ' credits')

        self.broadcast('spin', { stops: stops, credits: credits })

        if (credits === 0) {
            return setTimeout(function() {
                self.reset(cb)
            }, resetDelay)
        }

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

            setTimeout(function() {
                self.reset(cb)
            }, resetDelay)
        })
    })
}

module.exports = RwbMachine
