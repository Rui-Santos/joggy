var _ = require('underscore')
, debug = require('debug')('joggy:client')
, EventEmitter = require('events').EventEmitter
, bcrypt = require('bcrypt')
, Models = require('../../models')
, services = require('../services')
, util = require('util')

function Client(socket) {
    this.socket = socket
    //this.socket.on('withdraw', this.onWithdraw.bind(this))
    this.user = null
}

util.inherits(Client, EventEmitter);

Client.prototype.setUser = function(user) {
    var self = this
    self.user = user
    self.socket.emit('user', _.extend(user.model.profile()))
    //chat.broadcast({ text: self.user.get('username') + ' joins the game. say hi!' })

    self.socket.emit('balance', { balance: self.user.model.get('balance') })

    self.user.model.on('change:balance', function() {
        self.socket.emit('balance', { balance: self.user.model.get('balance') })
    })
}

Client.prototype.profile = function() {
    return _.extend(_.pick(this.user.toJSON(), 'balance', 'address'), this.user.profile());
}

/*Client.prototype.onWithdraw = function(packet) {
    var self = this
    , address = packet.address

    services.bitcoin.validateAddress(address, function(err, valid) {
        if (err) {
            console.error('validate address failed', err)
            return self.socket.emit('error', { message: 'couldnt validate address' })
        }

        if (!valid) {
            return self.socket.emit('error', { message: 'invalid withdraw address ' + address })
        }

        var amount = self.user.get('balance')
        console.log(util.inspect(self.user.attributes))

        if (amount <= 10 * 1e5) {
            return self.socket.emit('error', 'cannot withdraw less than 10*1e5(10 credits)')
        }

        debug('will withdraw ' + amount + ' to ' + address)

        db.get('users').take(self.user.id, amount, function(err) {
            if (err) {
                console.error('withdraw failed')
                return self.socket.emit('error', { message: 'withdraw failed' })
            }

            debug(util.format('sending %d to address %s', amount / 1e8, address))

            services.bitcoin.sendToAddress(address, amount / 1e8, function(err, txid) {
                if (err) {
                    console.error('failed to send bitcoins to ' + self.user.id + ' on ' + address)
                    console.error(err)

                    if (err.code == -4 && err.message == 'Insufficient funds') {
                        db.get('users').give(self.user.id, amount, function(err) {
                            if (err) {
                                return console.error('failed to refund after failed send', err)
                            }

                            console.log('refunded after failed send')
                        })

                        socket.emit('error', { message: 'failed to send bitcoins, contact support' })

                        return
                    }

                    return self.socket.emit('error', { message: 'failed to send bitcoins' })
                }

                debug('withdraw success, txid ' + txid)

                self.user.set('balance', self.user.get('balance') - amount)
            })
        })
    })
}*/

module.exports = Client