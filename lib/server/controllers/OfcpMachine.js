var _ = require('underscore')
, util = require('util')
, Machine = require('./Machine')
, ofcp = require('ofcp')
, Models = require('../../models')
, debug = require('debug')('joggy:ofcp')
, async = require('async')

var settings = {
}

var OfcpMachine = module.exports = function(model, options) {
    var self = this
    if (!options) throw new Error('options null')
    if (!_.isFunction(options.callback)) throw new Error('bad callback')

    Machine.apply(this, arguments)

    this.name = 'Ofcp'

    this.model.set({
        spots: [],
        button: 0,
        stage: 'waiting'
    })

    for (var i = 0; i < 2; i++) {
        this.model.get('spots').push({
            user: null
        })
    }

    this.reset(options.callback)
}

util.inherits(OfcpMachine, Machine)

OfcpMachine.game = 'ofcp'
OfcpMachine.model = Models.OfcpMachine

OfcpMachine.prototype.reset = function(cb) {
    debug('resetting')
    cb && cb(null, this)
}

OfcpMachine.prototype.add = function(client) {
    Machine.prototype.add.call(this, client)

    client.socket.emit('join', {
        _id: this.model.id,
        game: OfcpMachine.game
    })

    this.subscribe(client, 'sit', this.onClientSit.bind(this))
}

OfcpMachine.prototype.onClientSit = function(client, packet, cb) {
    if (!cb) throw new Error('cb missing')

    var existing = !!_.where(this.model.get('spots'), { user: client.user }).length

    if (existing) {
        return cb(new Error('already seated'))
    }

    var spot = _.where(this.model.get('spots'), { user: null })[0]

    if (!spot) {
        return cb(new Error('no free spots'))
    }

    spot.user = client.user

    this.broadcast('sit', {
        user: client.user.model.get('username'),
        spot: this.model.get('spots').indexOf(spot)
    })

    // todo: check if enough players

    this.deal(cb)
}

OfcpMachine.prototype.deal = function(cb) {
    debug('dealing')

    var that = this
    , deck = _.sortBy(_.range(1, 53), function() {
        return Math.random()
    })

    this.model.set('deck', deck)

    _.each(this.model.get('spots'), function(spot, index) {
        if (!spot.user) return

        debug('dealing to user ' + spot.user.model.id)

        spot.unset = deck.splice(0, 5)
        that.sendToUser(spot.user, 'unset', {
            cards: spot.unset
        })
    })

    cb()
}