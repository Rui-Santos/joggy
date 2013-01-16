var services = require('../services')
, _ = require('underscore')
, debug = require('debug')('joggy:user')
, Models = require('../../models')
, users = {}
, EventEmitter = require('events').EventEmitter
, util = require('util')
, Q = require('q')

function randomUsername() {
var first = ['Dr', 'Mr', '', '', '', '', 'Sgt', 'Lt', 'Sir', 'Mjr', 'Prof', 'Duke', 'Baron', 'Judge', 'Gen', 'Col', 'Adm', 'Pvt', 'Cpl']
    , middle = ['Bob', 'Joe', 'Jay', 'Ray', 'Cal', 'Rod', 'Rey', 'Lex', 'Rob', 'James', 'Lez', 'Zap', 'Zip',
        'Rey', 'Pax', 'Sun', 'Luc', 'Vin', 'Izy', 'Edd', 'Rex', 'Tim', 'Kim', 'Zoe', 'Max', 'Mel', 'Tod', 'Lia', 'Jon']
    , end = ['V', 'IV', 'Jr', 'Sr', 'Phd', 'MD', '', '', '', '1', '2', '3', '4', '5', '6', '7', '8', '9']


    var name = first[Math.floor(Math.random() * first.length)] +
        middle[Math.floor(Math.random() * middle.length)] +
        end[Math.floor(Math.random() * end.length)]

    return name
}

function User(model) {
    this.model = model
    this.model.sync = services.sync
}

util.inherits(User, EventEmitter)

User.prototype.available = function() {
    var held = -Math.min(0, this.model.get('wagered') - this.model.get('requirement'))
    , avail = this.model.get('balance') - held
    return avail
}

User.prototype.transfer = function(username, satoshi) {
    var self = this
    if (!username) throw new Error('username missing')
    if (!_.isNumber(satoshi)) throw new Error('satoshi not a number')
    if (satoshi <= 0) throw new Error('satoshi lte zero')
    if (satoshi % 1 !== 0) throw new Error('satoshi has decimals')
    return Q.ninvoke(User, 'fromUsername', username)
    .then(function(user) {
        if (!user) throw new Error('user ' + username + ' not found')
        if (user.model.id === self.model.id) throw new Error('cannot send to one self')
        return Q.ninvoke(self, 'take', satoshi, true)
        .then(function() {
            var reason = util.format('transfer from %s', self.model.get('username'))
            return Q.ninvoke(user, 'give', satoshi, reason)
        })
        .then(function() {
            return Q.ninvoke(self, 'log', {
                type: 'transfer',
                receiver: username,
                amount: -satoshi
            })
            .fail(function(err) {
                console.error('failed to log transfer for sender')
                console.error(err)
            })
        })
        .then(function() {
            self.emit('sentTransfer', {
                receiver: username,
                amount: satoshi
            })

            user.emit('receivedTransfer', {
                sender: self.model.get('username'),
                amount: satoshi
            })
        })
    })
}

User.fromUsername = function(username, cb) {
    var user = _.find(users, function(u) {
        return u.model.get('username').toLowerCase() === username.toLowerCase()
    })

    if (user) return cb(null, user)

    services.db.collection('users').findOne({ username: username }, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb(null, null)
        return User.find(doc._id, cb)
    })
}

User.find = function(id, cb) {
    if (users[id]) {
        debug('cache hit for user ' + id)
        return cb(null, users[id])
    }

    debug('cache miss for user ' + id)

    var coll = services.db.collection('users')

    coll.findOne({ _id: coll.id(id) }, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb(new Error('user not found'))
        var model = new Models.User(doc, { parse: true })

        // concurrency
        if (users[id]) return cb(null, users[id])

        var user = users[id] = new User(model)
        cb(null, user)
    })
}

User.findOrCreate = function(google, cb) {
    services.db.collection('users').findOne({ google: google }, function(err, user) {
        if (err) return cb(err)
        if (user) return User.find(user._id, cb)
        User.create(google, cb)
    })
}

User.create = function(google, cb) {
    var model = new Models.User({
        google: google,
        username: randomUsername()
    })

    model.sync = services.sync

    function saveModel() {
        model.save({}, {
            error: cb,
            success: function() {
                // concurrency
                if (users[model.id]) return cb(null, users[model.id])

                var user = users[model.id] = new User(model)
                cb(null, user)
            }
        })
    }

    if (!services.bitcoin) return saveModel()

    services.bitcoin.getNewAddress(function(err, address) {
        if (err) return cb(err)
        model.set({ address: address })
        saveModel()
    })
}

User.fromGoogle = function(google, cb) {
    services.db.collection('users').findOne({ google: google }, cb)
}

User.prototype.log = function(e, cb) {
    e.timestamp = +new Date()
    e.user = this.model.id

    debug('logging user activity ' + util.format(e))

    services.db.collection('users.log').insert(e, function(err) {
        if (err && !cb) throw err
        cb && cb(err)
    })

    debug('log ' + JSON.stringify(e))
}

User.prototype.wager = function(satoshi, reason, cb) {
    var self = this

    if (!_.isNumber(satoshi)) {
        return cb(new Error('not a number'))
    }

    if (self.model.get('balance') < satoshi) {
        var error = new Error('balance is too low')
        error.code = 'ENOFUNDS'
        return cb(error)
    }

    self.model.set({
        balance: self.model.get('balance') - satoshi,
        wagered: self.model.get('wagered') + satoshi
    })

    var coll = services.db.collection('users')

    coll.update({
        _id: coll.id(self.model.id)
    }, {
        $set: {
            balance: self.model.get('balance'),
            wagered: self.model.get('wagered')
        }
    }, function(err, updates) {
        if (err) return cb(err)

        if (!updates) {
            return cb(new Error('failed to take amount (no updates for user ' + self.model.id + ')'))
        }

        self.log({
            type: 'wager',
            amount: -satoshi,
            reason: reason
        })

        cb()
    })
}

User.prototype.bonus = function(satoshi, requirement, reason, cb) {
    var self = this

    if (!_.isNumber(satoshi)) {
        return cb(new Error('not a number'))
    }

    if (!_.isNumber(requirement)) {
        return cb(new Error('not a number'))
    }

    self.model.set({
        balance: self.model.get('balance') + satoshi,
        requirement: self.model.get('requirement') + requirement
    })

    var coll = services.db.collection('users')

    coll.update({
        _id: coll.id(self.model.id)
    }, {
        $set: {
            balance: self.model.get('balance'),
            requirement: self.model.get('requirement')
        }
    }, function(err, updates) {
        if (err) return cb(err)
        if (!updates) return cb(new Error('failed to give bonus'))

        self.log({
            type: 'bonus',
            amount: satoshi,
            reason: reason,
            requirement: requirement
        })

        cb()
    })
}

User.prototype.take = function(satoshi, available, cb) {
    var self = this

    if (!_.isNumber(satoshi)) throw new Error('satoshi not a number')
    if (satoshi <= 0) throw new Error('satoshi lte zero')
    if (satoshi % 1 !== 0) throw new Error('satoshi has decimals')

    if (!_.isNumber(satoshi)) {
        return cb(new Error('not a number'))
    }

    if (this.model.get('balance') < satoshi) {
        return cb(new Error('balance too low'))
    }

    if (available && this.available() < satoshi) {
        return cb(new Error('available too low'))
    }

    self.model.set({
        balance: self.model.get('balance') - satoshi
    })

    var coll = services.db.collection('users')

    coll.update({
        _id: coll.id(self.model.id)
    }, {
        $set: {
            balance: self.model.get('balance')
        }
    }, function(err, updates) {
        if (err) return cb(err)
        if (!updates) return cb(new Error('user not found'))
        cb()
    })
}

User.prototype.creditTransaction = function(txid, satoshi, cb) {
    var self = this

    if (!_.isNumber(satoshi)) {
        return cb(new Error('not a number'))
    }

    if (!self.model.get('tx')) self.model.set('tx', [])

    if (~self.model.get('tx').indexOf(txid)) {
        console.error('duplicate btc credit attempt for txid ' + txid)
        return cb()
    }

    self.model.get('tx').push(txid)

    var coll = services.db.collection('users')

    coll.update({
        _id: coll.id(self.model.id)
    }, {
        $push: {
            tx: txid
        }
    }, function(err) {
        if (err) return cb(err)

        self.give(satoshi, 'btc deposit ' + txid, cb)
    })
}

User.prototype.give = function(satoshi, reason, cb) {
    var self = this

    if (!_.isNumber(satoshi)) {
        return cb(new Error('not a number'))
    }

    self.model.set({
        balance: self.model.get('balance') + satoshi
    })

    var coll = services.db.collection('users')

    coll.update({
        _id: coll.id(self.model.id)
    }, {
        $set: {
            balance: self.model.get('balance'),
        }
    }, function(err, updates) {
        if (err) return cb(err)
        if (!updates) return cb(new Error('failed to give amount'))

        self.log({
            type: 'give',
            amount: satoshi,
            reason: reason
        })

        cb()
    })
}

module.exports = User
