var _ = require('underscore')
, debug = require('debug')('joggy:client')
, EventEmitter = require('events').EventEmitter
, bcrypt = require('bcrypt')
, Models = require('../../models')
, services = require('../services')
, util = require('util')
, Q = require('q')

function Client(socket) {
    this.onWithdraw = this.onWithdraw.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)
    this.onTransfer = this.onTransfer.bind(this)
    this.onUserModelChanged = this.onUserModelChanged.bind(this)

    this.socket = socket
    this.socket.on('withdraw', this.onWithdraw)
    this.socket.on('disconnect', this.onDisconnect)
    this.socket.on('transfer', this.onTransfer)

    this.user = null
}

util.inherits(Client, EventEmitter)

Client.prototype.tell = function(message) {
    services.site.chat.private({
        from: 'system',
        to: this.user.model.get('username'),
        message: message
    })
}

Client.prototype.onTransfer = function(e) {
    var self = this
    this.user.transfer(e.receiver, e.satoshi)
    .fail(function(err) {
        self.tell(util.format('failed to transfer: %s', err.toString()))
    })
    .then(function() {
        self.tell(util.format('%d CREDITS sent to %s', e.satoshi / 1e5, e.receiver))
    })
    .done()
}

Client.prototype.getAddress = function() {
    return this.socket.handshake.address.address
}

Client.prototype.onDisconnect = function() {
    debug('client has disconnected. removing handlers')
    this.socket.removeListener('withdraw', this.onWithdraw)
    this.socket.removeListener('disconnect', this.onDisconnect)

    if (this.user) {
        this.user.model.off('change', this.onUserModelChanged)
    }
}

Client.prototype.setUser = function(user) {
    this.user = user
    this.sendPrivateProfile()
    this.user.model.on('change', this.onUserModelChanged)
}

Client.prototype.onUserModelChanged = function(model, options) {
    debug(util.format('user model has changed, %j', options.changes))
    this.sendPrivateProfile(_.keys(options.changes))
}

Client.prototype.sendPrivateProfile = function(fields) {
    var allowed = ['address', 'balance', 'wagered', 'requirement', 'username', '_id']
    fields = fields ? _.intersection(allowed, fields) : allowed

    var values = _.pick(this.user.model.toJSON(), fields)
    this.socket.emit('user', values)
}

Client.prototype.onWithdraw = function(packet) {
    debug('processing withdraw')

    if (!services.bitcoin) {
        return this.socket.emit('error', 'bitcoin is disabled')
    }

    var self = this
    Q.fcall(function() {
        var held = -Math.min(0, self.user.model.get('wagered') - self.user.model.get('requirement'))
        , amount = packet.satoshi
        , avail = self.user.model.get('balance') - held

        if (!_.isNumber(amount)) throw new Error('bad amount')
        if (amount % 1 !== 0) throw new Error('bad amount (fraction)')

        if (avail < amount) {
            throw new Error('cannot withdraw more than available')
        }

        if (amount < 10 * 1e5) {
            throw new Error('cannot withdraw less than 10 credits')
        }

        debug('validating bitcoin address ' + packet.address)

        return Q.ninvoke(services.bitcoin, 'validateAddress', packet.address)
        .get('isvalid').then(function(valid) {
            if (valid === true) return packet.address
            if (valid === false) throw new Error('the address is not a valid bitcoin address')
            throw new Error('unable to determine whether address is valid')
        })
        .then(function() {
            debug('address validated, taking funds from user')
            return Q.ninvoke(self.user, 'take', amount, true)
        })
        .then(function() {
            debug('funds taken from user, sending funds')

            return Q.ninvoke(services.bitcoin, 'sendToAddress', packet.address, amount / 1e8)
            .fail(function(err) {
                console.error('failed to send money to user')
                console.error(err)

                var canReturn = false

                canReturn |= err.code == -4 && err.message == 'Insufficient funds'
                canReturn |= err.code === 'ECONNREFUSED'

                debug('can return funds? ' + canReturn)

                if (canReturn) {
                    return Q.ninvoke(self.user, 'give', amount)
                    .fail(function(err) {
                        console.error('failed to return funds to user after bitcoin withdraw failed')
                        console.error(err)
                        throw err
                    })
                    .then(function() {
                        throw err
                    })
                }

                throw err
            })
            .then(function(txid) {
                return Q.ninvoke(self.user, 'log', { type: 'withdraw', amount: -amount, address: packet.address, txid: txid })
            })
        })
    })
    .fail(function(err) {
        self.socket.emit('error', { message: 'failed to withdraw: ' + err.message })

        debug('withdraw failed')

        return Q.ninvoke(self.user, 'log', {
            type: 'error',
            action: 'withdraw',
            address: packet.address,
            error: err.message
        })
    })
    .done()
}

module.exports = Client
