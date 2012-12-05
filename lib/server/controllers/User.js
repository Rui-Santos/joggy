var services = require('../services')
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
    if (users[id]) return users[id]

    services.db.get('users').findOne({ _id: id }, function(err, user) {
        if (err) return cb(err)
        if (!user) return cb(new Error('user not found'))
        var model = new Models.User(user, { parse: true })
        cb(null, new User(model))
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

User.prototype.wager = function(satoshi, cb) {
    var self = this

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
