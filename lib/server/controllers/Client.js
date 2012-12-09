var _ = require('underscore')
, debug = require('debug')('joggy:client')
, EventEmitter = require('events').EventEmitter
, bcrypt = require('bcrypt')
, Models = require('../../models')
, services = require('../services')
, util = require('util')
, Q = require('q')

function Client(socket) {
    this.socket = socket
    this.socket.on('withdraw', this.onWithdraw.bind(this))
    this.user = null
}

util.inherits(Client, EventEmitter);

Client.prototype.setUser = function(user) {
    var self = this
    self.user = user
    self.sendPrivateProfile()
    self.user.model.on('change', self.onUserModelChanged.bind(self))
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
    var self = this
    Q.fcall(function() {
        var held = Math.max(0, self.user.model.get('requirement') - self.user.model.get('wagered'))
        , amount = self.user.model.get('balance') - held

        debug(util.format(
            'wagered(%d)-requirement(%d)=held(%d); balance(%d)-held=amount(%d)',
            self.user.model.get('wagered'),
            self.user.model.get('requirement'),
            held,
            self.user.model.get('balance'),
            amount))

        if (amount < 10 * 1e5) {
            throw new Error('cannot withdraw less than 10 credits')
        }

        return Q.ninvoke(services.bitcoin, 'validateAddress', packet.address)
        .get('isvalid').then(function(valid) {
            if (valid === true) return packet.address
            if (valid === false) throw new Error('the address is not a valid bitcoin address')
            throw new Error('unable to detminer whether address is valid')
        })
        .then(function() {
            return Q.ninvoke(self.user, 'take', amount)
        })
        .then(function() {
            return Q.ninvoke(services.bitcoin, 'sendToAddress', packet.address, amount / 1e8)
            .fail(function(err) {
                console.error('failed to send money to user')
                console.error(err)

                if (err.code == -4 && err.message == 'Insufficient funds') {
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
                return Q.ninvoke(self.user, 'log', { type: 'withdraw', amount: amount, address: packet.address })
            })
        })
    })
    .fail(function(err) {
        self.socket.emit('error', { message: 'failed to withdraw: ' + err.message })

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