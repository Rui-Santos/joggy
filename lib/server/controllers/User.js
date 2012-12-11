var services = require('../services')
, debug = require('debug')('joggy:user')
, Models = require('../../models')
, users = {}

function randomUsername() {
    var first = ['Dr', 'Mr', '', 'Sgt', '', '', '', '', 'Lt', 'Sir', 'Major', 'Prof', 'Duke', 'Baron']
    , middle = ['Bob', 'Joe', 'Jay', 'Ray', 'Cal', 'Rod', 'Rey', 'Lex', 'Rob', 'James']
    , name = first[Math.floor(Math.random() * first.length)] +
        middle[Math.floor(Math.random() * middle.length)] +
        Math.floor(Math.random() * 100)
    return name
}

function User(model) {
    this.model = model
    this.model.sync = services.sync
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

    services.bitcoin.getNewAddress(function(err, address) {
        if (err) return cb(err)
        model.set({ address: address })

        model.save({}, {
            error: cb,
            success: function() {
                var user = new User(model)
                cb(null, user)
            }
        })
    })
}

User.fromGoogle = function(google, cb) {
    services.db.get('users').findOne({ google: google }, cb)
}

User.prototype.log = function(e, cb) {
    e.timestamp = +new Date()
    services.db.get('users.log').insert(e, cb)
}

User.prototype.wager = function(satoshi, cb) {
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
        _id: self.model.id,
        balance: { $gte: satoshi }
    }, {
        $set: {
            balance: self.model.get('balance'),
            wagered: self.model.get('wagered')
        }
    }, function(err, updates) {
        if (err) return cb(err)
        if (!updates) return cb(new Error('failed to take amount'))
        cb()
    })
}

User.prototype.bonus = function(satoshi, requirement, description, cb) {
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
        self.log({ type: 'bonus', amount: satoshi, description: description })
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

User.prototype.give = function(satoshi, cb) {
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
        cb()
    })
}

module.exports = User
