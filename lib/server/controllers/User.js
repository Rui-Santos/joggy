var services = require('../services')
, debug = require('debug')('joggy:user')
, Models = require('../../models')
, users = {}

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

User.fromUsername = function(username, cb) {
    var user = _.find(users, function(u) {
        return u.model.get('username').toLowerCase() === username.toLowerCase()
    })

    if (user) return cb(null, user)

    services.db.get('users').findOne({ username: username }, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb(new Error('user not found'))
        return User.find(doc._id, cb)
    })
}

User.find = function(id, cb) {
    if (users[id]) {
        debug('cache hit for user ' + id)
        return cb(null, users[id])
    }

    debug('cache miss for user ' + id)

    services.db.get('users').findOne({ _id: id }, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb(new Error('user not found'))
        var model = new Models.User(doc, { parse: true })
        var user = users[id] = new User(model)
        cb(null, user)
    })
}

User.findOrCreate = function(google, cb) {
    services.db.get('users').findOne({ google: google }, function(err, user) {
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
                var user = new User(model)
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
    services.db.get('users').findOne({ google: google }, cb)
}

User.prototype.log = function(e, cb) {
    e.timestamp = +new Date()
    e.user = this.model.id
    services.db.get('users.log').insert(e, cb)
    debug('log ' + JSON.stringify(e))
}

User.prototype.wager = function(satoshi, reason, cb) {
    var self = this

    if (self.model.get('balance') < satoshi) {
        var error = new Error('balance is too low')
        error.code = 'ENOFUNDS'
        return cb(error)
    }

    self.model.set({
        balance: self.model.get('balance') - satoshi,
        wagered: self.model.get('wagered') + satoshi
    })

    services.db.get('users').update({
        _id: self.model.id
    }, {
        $set: {
            balance: self.model.get('balance'),
            wagered: self.model.get('wagered')
        }
    }, function(err, updates) {
        if (err) return cb(err)
        if (!updates) {
            console.log(arguments)
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

    self.model.set({
        balance: self.model.get('balance') + satoshi,
        requirement: self.model.get('requirement') + requirement
    })

    services.db.get('users').update({
        _id: self.model.id
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

User.prototype.take = function(satoshi, cb) {
    var self = this

    self.model.set({
        balance: self.model.get('balance') - satoshi
    })

    services.db.get('users').update({
        _id: self.model.id,
        balance: { $gte: satoshi }
    }, {
        $set: {
            balance: self.model.get('balance')
        }
    }, function(err, updates) {
        if (err) return cb(err)
        if (!updates) return cb(new Error('failed to take amount'))

        cb()
    })
}

User.prototype.creditTransaction = function(txid, satoshi, cb) {
    var self = this

    if (!self.model.get('tx')) self.model.set('tx', [])

    if (~self.model.get('tx').indexOf(txid)) {
        console.error('duplicate btc credit attempt for txid ' + txid)
        return cb()
    }

    self.model.get('tx').push(txid)

    services.db.get('users').update({
        _id: self.model.id
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

    self.model.set({
        balance: self.model.get('balance') + satoshi
    })

    services.db.get('users').update({
        _id: self.model.id
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
