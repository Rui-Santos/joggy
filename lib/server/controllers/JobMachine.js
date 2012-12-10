var _ = require('underscore')
, util = require('util')
, Queue = require('../../Queue')
, cards = require('../../cards')
, vpjob = require('../../vp-job')
, Models = require('../../models')
, crypto = require('crypto')
, shuffle = require('../../shuffle')
, debug = require('debug')('joggy:machine')
, Jackpot = require('./Jackpot')
, services = require('../services')
, Machine = require('./Machine')

function JobMachine(model, options) {
    Machine.apply(this, arguments)

    var self = this

    if (self.model.get('jackpot')) {
        debug('looking up the jackpot for the game')

        self.jackpot = Jackpot.find('job', function(err, jp) {
            if (err) throw err
            if (!jp) throw new Error('jackpot not found')
            self.jackpot = jp
            self.jackpot.model.on('change:current', self.onJackpotChange.bind(self))

            debug('jackpot found, ' + util.inspect(self.jackpot.model.toJSON()))

            if (self.model.get('state') === null) {
                debug('the game is in the null state, resetting')
                self.reset(options.callback)
            } else {
                options.callback && options.callback()
            }
        })
    } else {
        debug('game has no jacpot, will start immediately')

        if (self.model.get('state') === null) {
            debug('the game is in the null state, resetting')
            self.reset(options.callback)
        } else {
            options.callback()
        }
    }
}

util.inherits(JobMachine, Machine)

JobMachine.name = 'job'
JobMachine.model = Models.JobMachine

JobMachine.prototype.onJackpotChange = function() {
    this.broadcast('jackpot', { current: this.jackpot.model.get('current') })
}

JobMachine.prototype.reset = function(cb) {
    var self = this
    debug('resetting');

    var secret = crypto.createHash('sha1').update('' + Math.random()).digest('hex');
    debug('secret', secret);

    self.model.set({
        secret: secret,
        state: 'betting',
        contributions: {},
        hand: Models.JobMachine.emptyHand()
    })

    self.save(function(err) {
        if (err) console.error('failed to save machine during reset', err)
        self.broadcast('state', { state: 'betting' })
        cb && cb()
    })
},

JobMachine.prototype.shuffle = function() {
    debug('shuffling');
    var factors = [this.model.get('secret')];
    factors = factors.concat(_.values(this.model.get('contributions')));
    var deck = shuffle(factors);
    console.log('deck', deck.join());
    var cards = new Models.Cards(_.map(deck, function(x) { return { value: x }; }));
    this.model.set('deck', cards);
},

JobMachine.prototype.add = function(client) {
    this.clients.push(client);

    client.socket.emit('join', _.pick(
        this.model.toJSON(),
        '_id', 'state', 'hand', 'paytable', 'game'
    ))

    if (!this.players[client.user.model.id]) {
        this.broadcast('players:add', { player: client.user.model.profile() })
    }

    if (this.jackpot) {
        debug('sending the jackpot value to the new user')
        this.send(client, 'jackpot', { current: this.jackpot.model.get('current') })
    }

    console.log('when adding user, jp is ', this.jackpot, 'self is', this)

    this.subscribe(client, 'deal', this.onClientDeal.bind(this))
    this.subscribe(client, 'hold', this.onClientHold.bind(this))
    this.subscribe(client, 'contribute', this.onClientContribute.bind(this))
},

JobMachine.prototype.onClientContribute = function(client, message, cb) {
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

JobMachine.prototype.onClientHold = function(client, message, cb) {
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

JobMachine.prototype.onClientDeal = function(client, message, cb) {
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
        } else {
            console.log(self)
            debug('the game has no jackpot, not contributing')
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

module.exports = JobMachine

