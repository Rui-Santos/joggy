var _ = require('underscore')
, debug = require('debug')('joggy:client')
, db = require('./app.db')
, chat = require('./chat')
, EventEmitter = require('events').EventEmitter
, bcrypt = require('bcrypt')
, Models = require('../models')
, bitcoin = require('./bitcoin')
, util = require('util')
, Client = module.exports = function(socket) {
    this.socket = socket
    this.socket.on('withdraw', this.onWithdraw.bind(this))
    this.user = null
}

util.inherits(Client, EventEmitter);

_.extend(Client.prototype, {
    give: function(amount, callback) {
        if (amount <= 0) throw new Error('bad amount');
        this.user.set('balance', this.user.get('balance') + amount);
        db.get('users').give(this.user.id, amount, callback);
    },

    setUser: function(user) {
        var self = this
        self.user = user

        self.socket.emit('user', { user: self.profile() });

        chat.broadcast({ text: self.user.get('username') + ' joins the game. say hi!' })

        self.user.on('change:balance', function() {
            self.socket.emit('balance', { balance: self.user.get('balance') })
        })
    },

    profile: function() {
        return _.extend(_.pick(this.user.toJSON(), 'balance', 'address'), this.user.profile());
    },

    onWithdraw: function(packet) {
        var self = this
        , address = packet.address

        bitcoin.validateAddress(address, function(err, valid) {
            if (err) {
                console.error('validate address failed', err)
                return self.socket.emit('error', { message: 'couldnt validate address' })
            }

            if (!valid) {
                return self.socket.emit('error', { message: 'invalid withdraw address ' + address })
            }

            var amount = self.user.get('balance')
            console.log(util.inspect(self.user.attributes))

            debug('will withdraw ' + amount + ' to ' + address)

            db.get('users').take(self.user.id, amount, function(err) {
                if (err) {
                    console.error('withdraw failed')
                    return self.socket.emit('error', { message: 'withdraw failed' })
                }

                debug(util.format('sending %d to address %s', amount / 1e8, address))

                bitcoin.sendToAddress(address, amount / 1e8, function(err, txid) {
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
    }
})