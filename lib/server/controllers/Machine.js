var _ = require('underscore')
, Queue = require('../../Queue')
, cards = require('../../cards')
, vpjob = require('../../vp-job')
, Models = require('../../models')
, crypto = require('crypto')
, shuffle = require('../../shuffle')
, debug = require('debug')('joggy:machine')
, Jackpot = require('./Jackpot')
, services = require('../services')
, machines = {}

function Machine(model, options) {
    var self = this

    _.extend(this, options)

    self.model = model;
    self.model.sync = services.sync
    self.prefix = 'machine ' + self.model.id;
    self.players = {};
    self.clients = [];
    self.queue = new Queue();

    if (self.model.get('jackpot')) {
        debug('locating machine jackpot')

        Jackpot.find(self.model.get('jackpot'), function(err, jackpot) {
            if (err) throw err
            if (!jackpot) throw new Error('jackpot not found')
            self.jackpot = jackpot
            self.jackpot.model.on('change:current', self.onJackpotChange.bind(self))
            debug('machine jackpot found with current value ' + self.jackpot.model.get('current'))
            self.broadcast('jackpot', { current: self.jackpot.model.get('current') })
            self.reset()
        })
    } else {
        self.reset()
    }
}

Machine.findOrCreate = function(userId, cb) {
    var self = this

    debug('finding or creating a machine for user ' + userId)

    Machine.forUser(userId, function(err, machine) {
        if (err) return cb(err)

        // TODO: concurrency: machine may have been added to self.machines
        // can be solved by generating identifiers client side

        if (machine) return cb(null, machine)

        debug('creating a machine for user ' + userId)

        model = new Models.Machine({
            paytable: '9-6',
            owner: userId,
            jackpot: 'site'
        })

        model.sync = services.sync

        model.save({}, {
            success: function() {
                machine = machines[model.id] = new Machine(model, { jackpot: jackpot })
                cb(null, machine)
            },
            error: cb
        })
    })
}

Machine.forUser = function(userId, cb) {
    var self = this
    , machine = _.find(machines, function(m) {
        return m.model.get('owner') === userId
    })

    if (machine) return cb(null, machine)

    debug('finding a machine for user ' + userId)

    // HACK: only way i know how to have it not use object id conversion
    var q = { owner: { $regex: userId } }
    services.db.get('machines').findOne(q, function(err, doc) {
        if (err) return cb(err)
        if (!doc) return cb(null, null)
        var model = new Models.Machine(doc, { parse: true })
        machine = machines[model.id] = new Machine(model)
        cb(null, machine)
    })
}

Machine.prototype.save = function(cb) {
    this.model.save({}, {
        success: function() {
            cb()
        },
        error: cb
    })
}

Machine.prototype.onJackpotChange = function() {
    this.broadcast('jackpot', { current: this.jackpot.model.get('current') })
}

Machine.prototype.broadcast = function(name, message) {
    _.each(this.clients, function(client) {
        this.send(client, name, message);
    }, this);
}

Machine.prototype.reset = function(cb) {
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
        cb && cb()
    })
},

Machine.prototype.shuffle = function() {
    debug('shuffling');
    var factors = [this.model.get('secret')];
    factors = factors.concat(_.values(this.model.get('contributions')));
    var deck = shuffle(factors);
    console.log('deck', deck.join());
    var cards = new Models.Cards(_.map(deck, function(x) { return { value: x }; }));
    this.model.set('deck', cards);
},

Machine.prototype.send = function(client, name, message) {
    client.socket.emit(this.prefix + ':' + name, message);
},

Machine.prototype.subscribe = function(client, name, fn, context) {
    if (context) fn = _.bind(fn, context);
    client.socket.on(this.prefix + ':' + name, _.bind(function(message) {
        this.queue(function(cb) {
            fn(client, message, cb);
        });
    }, this));
},

Machine.prototype.add = function(client) {
    this.clients.push(client);

    client.socket.emit('join', _.pick(
        this.model.toJSON(),
        '_id', 'state', 'hand', 'paytable'
    ))

    if (!this.players[client.user.model.id]) {
        this.broadcast('players:add', { player: client.user.model.profile() })
    }

    this.subscribe(client, 'deal', this.onClientDeal, this);
    this.subscribe(client, 'hold', this.onClientHold, this);
    this.subscribe(client, 'contribute', this.onClientContribute, this);
},

Machine.prototype.onClientContribute = function(client, message, cb) {
    if (this.model.get('state') !== 'betting') {
        debug('error: contribute outside betting');
        return cb();
    }

    if (!_.isString(message.contribution) || message.contribution.length != 40) {
        debug('error: weird contribution');
        return cb();
    }

    if (this.model.get('contributions')[client.user.model.id]) {
        debug('error: second contribution');
        return cb();
    }

    debug('player ' + client.user.model.id + ' contributes ' + message.contribution);

    this.model.get('contributions')[client.user.model.id] = message.contribution;

    // note: leaking player ids
    this.broadcast('contribution', { player: client.user.model.id, contribution: message.contribution });

    cb();
},

Machine.prototype.onClientHold = function(client, message, cb) {
    var self = this

    if (self.model.get('state') !== 'hold') {
        debug('error: hold outside of hold')
        return cb()
    }

    debug('hold');

    // draw cards from deck
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
            cb();
        })
    }

    if (vpjob.ranks[rank] === 'royal flush' && coins === 5 && self.jackpot) {
        debug('hand is a max coin royal flush')

        return self.jackpot.pay(client.user, function(err, amount) {
            if (err) {
                console.error('failed to pay jackpot', err)
                return cb()
            }

            services.emit('jackpotWon', client.user, amount)

            self.reset(cb)
        })
    }

    client.user.give(payout * 1e5, function(err) {
        if (err) {
            console.error('failed to pay user winnings of ' + (payout * 1e5))
        }

        if (rank >= 4) {
            services.emit('bigWin', client.user, vpjob.ranks[rank], payout * 1e5)
        }

        self.reset(cb)
    })
}

Machine.prototype.onClientDeal = function(client, message, cb) {
    var self = this

    if (self.model.get('state') != 'betting') {
        debug('error: deal outside of betting');
        return cb();
    }

    if (!_.isNumber(message.bet) || Math.floor(message.bet) !== message.bet) {
        debug('error: weird bet');
        return cb();
    }

    if (message.bet > client.user.model.get('balance')) {
        debug('error: balance lower than bet');
        return cb();
    }

    if (!~[1, 2, 3, 4, 5].indexOf(message.bet)) {
        debug('error: weird bet (1, 2, ..., 5)')
        return cb()
    }

    self.model.set('bet', message.bet);

    client.user.wager(message.bet * 1e5, function(err) {
        if (err) {
            console.error(err)
            debug('failed to take bet');
            return cb();
        }

        if (self.jackpot) {
            debug('should contribute to the jackpot')

            var rate = vpjob.contributions[self.model.get('paytable')]
            , amount = message.bet * rate

            self.jackpot.contribute(amount * 1e5)
        }

        debug('shuffling')

        self.shuffle();

        self.model.set({
            state: 'hold'
        });

        self.model.set({
            hand: new Models.Cards(_.map(_.range(5), function() {
                return self.model.get('deck').pop();
            }))
        })

        debug('saving model')

        self.save(function(err) {
            if (err) console.error('failed to save machine after deal', err)
            self.broadcast('deal', { hand: self.model.get('hand').toJSON() });
            debug('deal');
            cb()
        })
    })
}

module.exports = Machine
