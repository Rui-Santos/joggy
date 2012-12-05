var services = require('../services')
, util = require('util')
, async = require('async')
, Models = require('../../models')
, debug = require('debug')('joggy:jackpot')
, jackpots = {}

function Jackpot(model) {
    this.model = model
}

Jackpot.find = function(id, cb) {
    if (jackpots[id]) return cb(null, jackpots[id])

    services.db.get('jackpots').findOne({ _id: id }, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb()
        var model = new Models.Jackpot(doc, { parse: true })
        var jackpot = new Jackpot(model)
        jackpots[model.id] = jackpot
        cb(null, jackpot)
    })
}

Jackpot.prototype.pay = function(user, cb) {
    var self = this

    debug(util.format('paying the jackpot %d (%d) to user %s', self.model.id, self.model.get('current'), user.model.id))

    var current = self.model.get('current')

    var q = { _id: self.model.id }
    var u = { $set: { current: self.model.get('seed') } }

    self.model.set({ current: self.model.get('seed') })

    services.db.get('jackpots').update(q, u, function(err, updates) {
        if (err) return cb(err)
        if  (!updates) return cb(new Error('jackpot ' + self.model.id + ' not found'))
        user.give(current, function(err) {
            if (err) return cb(err)
            cb(null, current)
        })
    })
}

Jackpot.prototype.contribute = function(satoshi, cb) {
    var self = this

    debug('updating jackpot ' + self.model.id + ' with a contribution of ' + satoshi)

    self.model.set({
        current: self.model.get('current') + satoshi
    })

    services.db.get('jackpots').update({
        _id: this.model.id
    }, {
        $set: { current: self.model.get('current') }
    }, function(err, updates) {
        if (err) {
            if (cb) return cb(err)
            throw err
        }

        if (!updates) return cb(new Error('jackpot not found'))

        cb && cb()
    })
}

module.exports = Jackpot
