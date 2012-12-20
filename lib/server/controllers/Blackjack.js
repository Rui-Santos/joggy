var _ = require('underscore')
, util = require('util')
, bj = require('../../bj')

var settings = {
    bettingTime: 1000 * 30,
    decisionTime: 1000 * 15
}

function BjMachine(model, options) {
    Machine.apply(this, arguments)

    this.name = 'Blackjack'

    var self = this

    if (self.state === null) {
        this.resume(options.callback)
    } else {
        this.reset(options.callback)
    }
}

util.inherits(BjMachine, Machine)

BjMachine.game = 'job'
BjMachine.model = Models.BjMachine

BjMachine.prototype.reset = function(cb) {
    var self = this

    if (this.state === null) {
        this.state = new BjMachine.model({
            stage: 'betting',
            seats: _.range(5).map(function(si) {
                return {
                }
            })
        })
    }

    this.broadcast('betting')
}

BjMachine.prototype.onClientSit = function(client, packet, cb) {
    if (this.model.get('state') !== 'betting') throw new Error('bad state')
    if (!client.player) throw new Error('client is guest')
    if (arguments.length !== 3) throw new Error('bad argument count')
    if (packet.seat % 1 !== 0) throw new Error('bad seat')

    var seat = this.model.get('seats').at(packet.seat)
    if (!seat) throw new Error('seat not found')
    if (seat.player !== null) throw new Error('seat taken')
    seat.player = client.player

    this.broadcast('sit', { seat: packet.seat, player: client.player.model.id })

    cb()
}

BjMachine.prototype.eject = function(seatIndex) {
    this.model.get('seats')[seatIndex].player = null
    this.broadcast('eject', { seat: packet.seat })
}

BjMachine.prototype.onClientEject = function(client, packet, cb) {
    if (!client.player) throw new Error('client is guest')
    if (arguments.length !== 3) throw new Error('bad argument count')
    if (packet.seat % 1 !== 0) throw new Error('bad seat')

    var seat = this.model.get('seats')[packet.seat]
    if (!seat) throw new Error('seat not found')
    if (seat.player === null) throw new Error('seat not taken')
    if (seat.player !== client.player) throw new Error('player not in seat')

    this.eject(packet.seat)

    cb()
}

BjMachine.prototype.boxIfClientControls = function(client, boxIndex) {
    var box = this.model.get('boxes').at(boxIndex);
    if (_.isUndefined(box)) debug('eject: box bad/missing', boxIndex);
    else if (!box.get('player')) debug('eject: box not occupied');
    else if (box.get('player').id != client.player.id) debug('eject: player does not own box', boxIndex);
    else return box;
    return null;
}

BjMachine.prototype.handIfClientOnTurn = function(client, boxIndex, handIndex) {
    if (this.model.get('state') != 'playing') return null;
    var box = this.boxIfClientControls(client, boxIndex);
    if (!box) return null;
    if (this.model.get('turn')[1] !== handIndex) return null;
    var hand = box.get('hands').where({ index: handIndex })[0];
    return hand;
},


BjMachine.prototype.onClientAdd = function(client, callback) {
    debug('adding client', client.socket.id)
    var existing = !!_.where(this.clients, { player: client.player })[0];

    debug('adding', (existing?'existing':'new'), 'client', client.socket.id, 'to table', this.model.id, 'player', client.player.id);

    this.clients.push(client);

    if (!existing) {
        this.model.get('players').push(client.player);
        this.broadcast('join', _.pick(client.player.toJSON(), '_id', 'name'));
    }

    _.each({
        'sit': this.onClientSit,
        'bet': this.onClientBet,
        'hit': this.onClientHit,
        'stand': this.onClientStand,
    }, function(fn, k) {
        client.socket.on('table ' + this.model.id + ':' + k, _.bind(function(message) {
            this.queue(function(callback) {
                fn.call(this, client, message, callback);
            });
        }, this));
    }, this);

    client.socket.on('disconnect', _.bind(function() {
        this.clients.splice(this.clients.indexOf(client), 1);
    }, this));

    callback();
},


BjMachine.prototype.onClientBet = function(client, message, callback) {
    if (this.model.get('state') != 'betting') {
        return this.send(client, 'error', 'bet outside betting state');
        return callback();
    }

    var box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'bet: box check failed');
        return callback();
    }

    if (!message.bet || message.bet < 0) {
        this.send(client, 'error', 'bet: weird amount');
        return callback();
    }

    if (message.bet > box.get('player').get('balance')) {
        this.send(client, 'error', 'balance doesnt cover bet');
        return callback();
    }

    db.get('users').take(box.get('player').id, message.bet, _.bind(function(err) {
        if (err) {
            client.send('error', 'take fail');
            return callback();
        }

        box.get('player').set('balance', box.get('player').get('balance') - message.bet);
        box.set('bet', (box.get('bet') || 0) + message.bet);
        box.set('idleSince', +new Date);
        this.broadcast('bet', { box: message.box, bet: message.bet });

        if (this.endBettingTimer) clearTimeout(this.endBettingTimer);

        this.endBettingTimer = this.setTimeout(this.deal, 3000);

        callback();
    }, this));
}

BjMachine.prototype.onClientStand = function(client, message, callback) {
    if (this.model.get('state') != 'playing') {
        this.send(client, 'error', 'stand: outside playing state');
        return callback();
    }

    var box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'stand: box check failed');
        return callback();
    }

    if (this.model.get('turn')[0] !== box.get('index')) {
        this.send(client, 'error', 'box not on turn');
        return callback();
    }

    if (this.model.get('turn')[1] !== message.hand) {
        this.send(client, 'error', 'hand not on turn');
        return callback();
    }

    this.nextTurn(callback);
},


BjMachine.prototype.onClientHit = function(client, message, callback) {
    var box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'hit: box check fail');
        return callback();
    }

    var hand = this.handIfClientOnTurn(client, message.box, message.hand);

    if (!hand) {
        this.send(client, 'error', 'hit: hand check fail');
        return callback();
    }

    var card = new Models.Card(this.model.get('deck').pop());
    hand.get('cards').push(card);
    debug('player hits a', card.pretty(), 'to a', hand.get('cards').pretty());
    this.broadcast('hit', card.get('value'));

    var score = hand.get('cards').score();

    if (score == 21) {
        debug('player has drawn to 21, auto standing');
        this.nextTurn(callback);
        return;
    }

    if (score > 21) {
        debug('player has busted');
        box.get('hands').remove(hand);
        this.nextTurn(callback);
        return;
    }

    debug('player has a new sum of', hand.get('cards').sum(), 'and can still draw');
    this.broadcast('turn', this.model.get('turn'));

    callback();
},

BjMachine.prototype.deal = function(cb) {
    if (this.model.get('state') !== 'betting') throw new Error('bad state')
    var deck = _.sortBy(_.range(1, 52 * 6 + 1), function() { return Math.random() })
    this.model.set('deck', deck)

    var seats = this.model.get('seats').filter(function(seat) {
        return seat.player && seat.bet
    })

    _.each(seats, function(seat) {
        seat.splits = 0
        seat.hands = [{
            cards: [deck.pop()]
        }]
    })

    this.model.set('dealer', [deck.pop()])
    this.model.set('turn', null)

    _.each(seats, function(seat) {
        seat.hands[0].cards.push(deck.pop())
    })

    this.model.get('dealer').push(deck.pop())

    this.broadcast('deal', {
        seats: seats.map(function(s) {
            return s.hands[0].cards
        }),

        dealer: this.model.get('dealer')[0]
    })

    this.nextTurn(cb)
}

BjMachine.prototype.getNextTurn = function(turn) {
    turn = turn ? turn.slice(0) : null;

    while (true) {
        if (!turn) {
            turn = [0, 0];
        } else if (this.model.get('boxes')[turn[0]].splits > turn[1]) {
            turn[1]++;
        } else if (this.model.get('boxes').length > turn[0] + 1) {
            turn[0]++;
            turn[1] = 0;
        } else {
            return null;
        }

        var box = this.model.get('boxes').byIndex(turn[0]);
        var hand = box.get('hands').byIndex(turn[1]);
        if (!hand) continue;
        if (!hand.get('bet')) continue;
        if (hand.get('cards').score() == 21) continue;
        // todo: no hit split aces check

        return turn;
    }
}

BjMachine.prototype.settle = function(callback) {
    var dealerScore = this.model.get('dealer').score()
    , dealerCards = this.model.get('dealer').plain();

    this.model.get('boxes').each(function(box) {
        box.get('hands').each(function(hand) {
            var handScore = hand.get('cards').score();
            // todo: checked?
            var handCards = hand.get('cards').plain();
            var dealerChecked = this.model.get('state') == 'playing';
            var returned = blackjack.settle(box.get('splits'), handCards, dealerCards, dealerChecked) * hand.get('bet');

            debug('settling box', box.get('index'), 'hand', hand.get('index'), 'with', hand.get('cards').pretty(), 'vs dealer', this.model.get('dealer').pretty());

            if (returned > 0) {
                // todo: async issues
                db.get('users').give(box.get('player').id, returned);
                box.get('player').set('balance', box.get('player').get('balance') + returned);
            }
        }, this);

        box.get('hands').reset();
    }, this);

    callback();
}

BjMachine.prototype.end = function(callback) {
    this.model.set('turn', null);

    this.settle(_.bind(function() {
        this.model.get('dealer').reset();
        this.betting(callback);
    }, this));
}

BjMachine.prototype.open = function(callback) {
    var self = this

    debug('dealer opens');

    async.series({
        reveal: _.bind(function(callback) {
            debug('dealer reveals', this.model.get('dealer').at(1).pretty());
            this.broadcast('dealer:card', { card: this.model.get('dealer').at(1).toJSON() });
            setTimeout(callback, 1000);
        }, this),
        draw: _.bind(function(callback) {
            async.whilst(
                _.bind(function() {
                    return this.model.get('dealer').score() < 17;
                }, this),
                _.bind(function(callback) {
                    var card = this.model.get('deck').pop();
                    this.model.get('dealer').push(card);
                    debug('dealer draws a', card.pretty(), 'and has', this.model.get('dealer').pretty());
                    this.broadcast('dealer:card', { card: card.toJSON() });
                    setTimeout(callback, 1000);
                }, this),
                callback
            );
        }, this)
    }, _.bind(function() {
        this.end(callback);
    }, this));
},


BjMachine.prototype.nextTurn = function(cb) {
    if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
    }

    var turn = this.getNextTurn(this.model.get('turn'));

    if (turn) {
        this.model.set('turn', turn);
        this.broadcast('turn', turn);
        this.turnTimer = this.setTimeout(this.onTurnTimeout, settings.decisionTime);
        cb();
        return;
    }

    var challengers = this.model.get('boxes').filter(function(b) {
        // any non-blackjack hand
        return b.get('hands').length && (b.get('splits') > 0 || !bj.isBlackjack(b.get('hands').at(0).get('cards').plain()));
    });

    if (challengers.length) {
        debug('dealer will open to challenge', _.where(this.model.get('boxes'), function(b) { return b.get('hands').length > 0; }));
        this.model.set('turn', null);
        this.open(cb);
        return;
    } else {
        debug('there are no hands to challenge dealer');
    }

    this.end(cb);
}


BjMachine.prototype.nextTurn = function(cb) {
    var turn = this.model.get('turn')

    while (true) {
        if (!turn) {
            turn = [0, 0]
        }

        var seat = this.model.get('seats')[turn[0]]

        if (!seat) {
            // reached the end
            throw new Error('ni')
        }

        if (!seat.bet) {
            continue
        }

        if ()
    }
}


module.exports = BjMachine
