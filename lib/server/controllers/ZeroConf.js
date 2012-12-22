var Blockchain = require('blockchain')
, services = require('../services')
, User = require('./User')
, _ = require('underscore')
, debug = require('debug')('joggy:zeroconf')

function ZeroConf() {
    debug('constructing blockchain link')

    this.blockchain = new Blockchain()
    this.blockchain.on('connect', this.onConnect.bind(this))
    this.blockchain.on('connectFailed', this.onConnectFailed.bind(this))
    this.blockchain.on('disconnect', this.onDisconnect.bind(this))

    services.on('addClient', this.addClient.bind(this))
}

ZeroConf.prototype.onConnect = function() {
    debug('connected to blockchain')
}

ZeroConf.prototype.onConnectFailed = function() {
    var self = this
    debug('failed to connect to blockchain, retrying in 5 sec')

    setTimeout(function() {
        self.blockchain.open()
    }, 5000)
}

ZeroConf.prototype.onDisconnect = function() {
    var self = this
    debug('disconnected from blockchain, retrying in 5 sec')

    setTimeout(function() {
        self.blockchain.open()
    }, 5000)
}

ZeroConf.prototype.addClient = function(client) {
    if (!client.user) return
    if (!client.user.model.get('address')) return
    debug('subscribing to user address ' + client.user.model.get('address'))
    this.blockchain.subscribe(client.user.model.get('address'), this.onTransaction.bind(this, client.user))
}

ZeroConf.prototype.onTransaction = function(user, tran) {
    if (tran.hash.length !== 64) return debug('ignoring hash with weird hash, ' + tran.hash)

    _.each(tran.out, function(o) {
        if (o.type !== 0) return debug('ignoring output of type ' + o.type)
        if (o.addr !== user.model.get('address')) return debug('ignoring output not for this user')
        if (o.value > 10e8) return debug('ignoring large transaction, ' + o.value + ' satoshis')

        user.creditTransaction(tran.hash, o.value, function(err) {
            if (err) return console.error('failed to credit transaction ' + txid)
            debug('transaction credited from live stream ' + tran.hash)
        })
    })
}

module.exports = ZeroConf
