var _ = require('underscore')
, Queue = require('../Queue')
, cards = require('../cards')
, vpjob = require('../vp-job')
, Models = require('../models')
, crypto = require('crypto')
, db = require('./app.db')
, chat = require('./chat')
, shuffle = require('../shuffle')
, debug = require('debug')('joggy:machine')
, Machine = module.exports = function(model, options) {
    debug('constructing');
    _.extend(this, options);
    this.model = model;
    this.prefix = 'machine ' + this.model.id;
    this.players = {};
    this.clients = [];
    this.queue = new Queue();

    if (this.model.get('state') === null) {
        this.reset()
    }

    if (this.jackpot) {
        this.jackpot.on('change:current', this.onJackpotChange, this);
    }
};

_.extend(Machine.prototype, {
    save: function(callback) {
        this.model.save({}, {
            success: function() {
                callback()
            },

            error: function(err) {
                callback(err)
            }
        })
    },

    onJackpotChange: function() {
        this.broadcast('jackpot', { current: this.jackpot.get('current') });
    },

    broadcast: function(name, message) {
        _.each(this.clients, function(client) {
            this.send(client, name, message);
        }, this);
    },

    reset: function(callback) {
        var self = this
        debug('resetting');

        var secret = crypto.createHash('sha1').update('' + Math.random()).digest('hex');
        debug('secret', secret);

        self.model.set({
            secret: secret,
            state: 'betting',
            contributions: {},
            hand: Models.Machine.emptyHand()
        })

        self.save(function(err) {
            if (err) console.error('failed to save machine during reset', err)
            self.broadcast('state', { state: 'betting' })
            callback && callback()
        })
    },

    shuffle: function() {
        debug('shuffling');
        var factors = [this.model.get('secret')];
        factors = factors.concat(_.values(this.model.get('contributions')));
        var deck = shuffle(factors);
        console.log('deck', deck.join());
        var cards = new Models.Cards(_.map(deck, function(x) { return { value: x }; }));
        this.model.set('deck', cards);
    },

    send: function(client, name, message) {
        client.socket.emit(this.prefix + ':' + name, message);
    },

    subscribe: function(client, name, fn, context) {
        if (context) fn = _.bind(fn, context);
        client.socket.on(this.prefix + ':' + name, _.bind(function(message) {
            this.queue(function(callback) {
                fn(client, message, callback);
            });
        }, this));
    },

    add: function(client) {
        this.clients.push(client);

        if (!this.players[client.user.id]) {
            this.broadcast('players:add', { player: client.user.profile() });
        }

        this.subscribe(client, 'deal', this.onClientDeal, this);
        this.subscribe(client, 'hold', this.onClientHold, this);
        this.subscribe(client, 'contribute', this.onClientContribute, this);
    },

    onClientContribute: function(client, message, callback) {
        if (this.model.get('state') !== 'betting') {
            debug('error: contribute outside betting');
            return callback();
        }

        if (!_.isString(message.contribution) || message.contribution.length != 40) {
            debug('error: weird contribution');
            return callback();
        }

        if (this.model.get('contributions')[client.user.id]) {
            debug('error: second contribution');
            return callback();
        }

        debug('player ' + client.user.id + ' contributes ' + message.contribution);

        this.model.get('contributions')[client.user.id] = message.contribution;

        // note: leaking player ids
        this.broadcast('contribution', { player: client.user.id, contribution: message.contribution });

        callback();
    },

    onClientHold: function(client, message, callback) {
        var self = this

        if (self.model.get('state') != 'hold') {
            debug('error: hold outside of hold');
            return callback();
        }

        debug('hold');

        var drawn = [];

        for (var i = 0; i < 5; i++) {
            if (!message.hold[i]) {
                var card = self.model.get('deck').pop();
                self.model.get('hand').at(i).set(card.toJSON());
                drawn.push({ index: i, card: card.toJSON() });
            }
        }

        if (drawn.length) {
            self.broadcast('draw', { drawn: drawn });
        }

        self.broadcast('reveal', { secret: self.model.get('secret') });

        var coins = self.model.get('bet');
        var hand = _.pluck(self.model.get('hand').toJSON(), 'value');

        var payout = vpjob.payout(hand, self.model.get('paytable'), coins);
        var rank = vpjob.rank(hand);

        if (!payout) {
            return self.reset(function() {
                callback();
            })
        }

        if (vpjob.ranks[rank] === 'royal flush' && coins === 5 && self.jackpot) {
            debug('hand is a max coin royal flush');

            db.get('jackpots').pay(
                self.model.get('jackpot'),
                client.user.id,
                self.jackpot.get('seed'),
                function(err, amount) {
                    if (err) return console.log('failed to pay jackpot ', err);
                    client.user.set('balance', client.user.get('balance') + amount);
                    self.jackpot.set('current', self.jackpot.get('seed'));
                    chat.broadcast({ text: client.user.get('username') + ' wins the jackpot ' + (amount / 1e5) + '!' })
                    self.reset(function() {
                        callback()
                    })
                }
            )

            return;
        }

        db.get('users').give(client.user.id, payout * 1e5, function(err) {
            if (err) {
                debug('failed to pay player ' + err);
                return callback();
            }

            client.user.set('balance', client.user.get('balance') + payout * 1e5);

            if (rank >= 5) {
                var rankName = vpjob.ranks[rank];
                chat.broadcast({ text: client.user.get('username') + ' wins ' + payout + ' with a ' + rankName + '!' });
            }

            self.reset();

            callback()
        })
    },

    onClientDeal: function(client, message, callback) {
        var self = this

        if (self.model.get('state') != 'betting') {
            debug('error: deal outside of betting');
            return callback();
        }

        if (!_.isNumber(message.bet) || Math.floor(message.bet) !== message.bet) {
            debug('error: weird bet');
            return callback();
        }

        if (message.bet > client.user.get('balance')) {
            debug('error: balance lower than bet');
            return callback();
        }

        if (!~[1, 2, 3, 4, 5].indexOf(message.bet)) {
            debug('error: weird bet (1, 2, ..., 5)');
            return callback();
        }

        self.model.set('bet', message.bet);

        db.get('users').take(client.user.id, message.bet * 1e5, function(err) {
            if (err) {
                console.error(err)
                debug('failed to take bet');
                return callback();
            }

            client.user.set('balance', client.user.get('balance') - message.bet * 1e5);

            if (self.jackpot && self.jackpot.contribute) {
                var rate = vpjob.contributions[self.model.get('paytable')];
                var amount = message.bet * rate;

                debug('contributing ' + amount + ' to the jackpot');
                self.jackpot.contribute(amount * 1e5);
            }

            debug('shuffling')

            self.shuffle();

            self.model.set({
                state: 'hold'
            });

            self.model.set('hand', new Models.Cards(_.map(_.range(5), function() {
                return self.model.get('deck').pop();
            }, self)));

            console.log('hand before', self.model.get('hand').toJSON())

            debug('saving model')

            self.save(function(err) {
                if (err) console.error('failed to save machine after deal', err)
                self.broadcast('deal', { hand: self.model.get('hand').toJSON() });
                debug('deal');
                callback()
            })
        })
    }
})