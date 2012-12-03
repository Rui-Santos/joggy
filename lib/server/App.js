var express = require('express')
, _ = require('underscore')
, util = require('util')
, Machine = require('./Machine')
, Client = require('./Client')
, db = require('./app.db')
, config = require('../../config')
, async = require('async')
, debug = require('debug')('joggy:app')
, Models = require('../models');

var App = module.exports = function(port) {
    var self = this;

    self.app = express();
    var sessionStore = new express.session.MemoryStore()
    var Session = require('connect').middleware.session.Session;

    self.app.use(express.cookieParser());
    self.app.use(express.bodyParser());
    self.app.use(express.session({
        secret: config.session,
        store: sessionStore,
        // allow client to know if he has a session
        cookie: { httpOnly: false }
    }));

    require('./app.auth').configure(self.app)

    self.server = require('http').createServer(self.app);

    debug('http server listening on ' + port);

    self.server.listen(port);

    self.socket = require('./app.io').configure(self.server);

    // https://github.com/LearnBoost/socket.io/wiki/Authorizing
    self.socket.configure(function() {
        self.socket.set('authorization', function(data, cb) {
            if (!data.headers.cookie) return cb(null, true)
            var signedCookies = require('cookie').parse(data.headers.cookie)
            data.cookies = require('connect/lib/utils').parseSignedCookies(signedCookies, config.session)
            var sid = data.cookies['connect.sid']
            debug('looking for session ' + sid)
            sessionStore.get(sid, function(err, session) {
                if (err) {
                    debug('auth fail ' + err.message)
                    return cb('internal error', false)
                }

                if (!session) return cb('session not found', false)

                data.session = session
                debug('session found')
                cb(null, true)
            })
        })
    })

    self.socket.on('connection', self.onSocketConnection.bind(self))

    self.machines = {};
    self.clients = [];
    self.jackpots = {};

    self.chat = require('./chat');

    self.chat.on('chat', _.bind(function(message) {
        debug('chat', message);
        self.chat.broadcast({ text: message.text, user: message.client.user.get('username') })
    }, self))

    self.faucet = require('./faucet')

    require('./app.assets').configure(this.app);

    self.bitcoin = require('./bitcoin')
    self.bitcoin.on('credit', self.onUserCredited.bind(self))
}

_.extend(App.prototype, {
    jackpotContribute: function(jackpot, amount) {
        db.get('jackpots').contribute(jackpot.id, amount, function() {
            jackpot.set('current', jackpot.get('current') + amount);
        });
    },

    getJackpot: function(id) {
        var jackpot = this.jackpots[id];

        if (!jackpot) {
            jackpot = this.jackpots[id] = new Models.Jackpot({ _id: id });
            jackpot.sync = db.sync;
            jackpot.contribute = _.bind(function(amount) { this.jackpotContribute(jackpot, amount); }, this);

            debug('fetching jackpot ' + id);

            jackpot.fetch();
        }

        return jackpot;
    },

    getMachine: function(model) {
        var machine = this.machines[model.id];

        if (!machine) {
            var options = {
                jackpot: model.get('jackpot') ? this.getJackpot(model.get('jackpot')) : null
            };

            machine = this.machines[model.id] = new Machine(model, options);
        }

        return machine;
    },

    onSocketConnection: function(socket) {
        var self = this
        , client = new Client(socket)

        self.clients.push(client)

        if (socket.handshake.session && socket.handshake.session.user) {
            client.setUser(new Models.User(socket.handshake.session.user, { parse: true }))

            client.user.on('change:balance', function() {
                socket.emit('balance', { balance: client.user.get('balance') })
            })

            socket.emit('user', _.extend(client.user.profile(), {
                address: client.user.get('address')
            }))

            socket.emit('balance', { balance: client.user.get('balance') })

            self.findOrCreateMachine(client, function(err, machine) {
                if (err) return client.socket.emit('error', 'join machine error');

                client.socket.emit('join', _.pick(
                    machine.model.toJSON(),
                    '_id', 'state', 'hand', 'paytable'
                ));

                machine.add(client);
            })
        }

        self.chat.addClient(client);
    },

    onUserCredited: function(userId, satoshi) {
        var self = this
        , client = _.find(self.clients, function(c) {
            return c.user.id === userId
        })

        if (!client) return debug('credited user is not connected')
        client.user.set({ balance: client.user.get('balance') + satoshi })
    },

    findOrCreateMachine: function(client, callback) {
        var machineDoc;

        async.series({
            // todo: look in this.machines
            'find': function(callback) {
                db.get('machines').findOne({ owner: client.user.id }, function(err, doc) {
                    machineDoc = doc;
                    callback(err);
                });
            },

            'create': function(callback) {
                if (machineDoc) return callback();

                machineDoc = {
                    owner: client.user.id,
                    paytable: '9-6',
                    jackpot: 'site'
                };

                db.get('machines').insert(machineDoc, function(err, doc) {
                    machineDoc = doc;
                    callback(err);
                });
            }
        }, _.bind(function(err) {
            if (err) return callback(err);
            callback(null, this.getMachine((new Models.Machine(machineDoc))));
        }, this));
    }
})
