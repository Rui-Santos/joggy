var _ = require('underscore')
, util = require('util')
, Machine = require('./Machine')
, bj = require('../../bj')
, Models = require('../../models')
, debug = require('debug')('joggy:bj')
, async = require('async')
, cards = require('../../cards')

var settings = {
    bettingTime: 1000 * 30,
    decisionTime: 1000 * 15
}

function BjMachine(model, options) {
    if (!options) throw new Error('options null')
    if (!_.isFunction(options.callback)) throw new Error('bad callback')

    Machine.apply(this, arguments)

    this.name = 'Blackjack'

    if (this.model.get('stage') !== null) {
        this.resume(options.callback)
    } else {
        this.reset(options.callback)
    }
}

util.inherits(BjMachine, Machine)

BjMachine.game = 'job'
BjMachine.model = Models.BjMachine

BjMachine.prototype.resume = function(cb) {
    cb(new Error('resume ni'))
}

BjMachine.prototype.reset = function(cb) {
    debug('resetting')
    this.model.set('state', 'betting')
    this.broadcast('betting')

    _.each(this.model.get('boxes'), function(box) {
        box.bet = 0
        box.hands = null
        box.splits = 0
    })

    cb(null, this)
}

BjMachine.prototype.sit = function(index, user) {
    if (!user) throw new Error('user null')

    var box = this.model.get('boxes')[index]
    if (!box) throw new Error('box does not exist')
    if (box.player) throw new Error('box is taken')
    if (this.model.get('state') !== 'betting') throw new Error('cannot eject outside betting state')
    box.player = user

    this.broadcast('sit', {
        box: index,
        player: {
            id: user.model.id,
            name: user.model.get('username')
        }
    })
}

BjMachine.prototype.onClientSit = function(client, packet, cb) {
    if (this.model.get('state') !== 'betting') throw new Error('bad state')
    if (!client.user) throw new Error('client is guest')
    if (arguments.length !== 3) throw new Error('bad argument count')
    if (packet.box % 1 !== 0) throw new Error('bad box')

    var box = this.model.get('boxes')[packet.box]
    if (!box) throw new Error('box not found')
    if (box.player) throw new Error('box taken')
    box.player = client.user

    this.broadcast('sit', { box: packet.box, player: client.user.model.id })

    cb()
}

BjMachine.prototype.eject = function(index) {
    var box = this.model.get('boxes')[index]
    if (!box) throw new Error('box does not exist')
    if (!box.player) throw new Error('box is empty')
    if (this.model.get('state') !== 'betting') throw new Error('cannot eject outside betting state')
    box.player = null
    this.broadcast('eject', { box: index })
}

BjMachine.prototype.onClientEject = function(client, packet, cb) {
    if (!client.player) throw new Error('client is guest')
    if (arguments.length !== 3) throw new Error('bad argument count')
    if (packet.box % 1 !== 0) throw new Error('bad box')

    var box = this.model.get('boxes')[packet.box]
    if (!box) throw new Error('box not found')
    if (box.player === null) throw new Error('box not taken')
    if (box.player !== client.player) throw new Error('player not in box')

    this.eject(packet.box)

    cb()
}

BjMachine.prototype.boxIfClientControls = function(client, boxIndex) {
    var box = this.model.get('boxes')[boxIndex]
    if (_.isUndefined(box)) debug('box bad/missing', boxIndex)
    else if (!box.player) debug('box not occupied')
    else if (box.player.model.id != client.user.model.id) debug('player does not own box', boxIndex)
    else return box
    return null
}

BjMachine.prototype.handIfClientOnTurn = function(client, boxIndex, handIndex) {
    if (this.model.get('state') != 'playing') return null;
    var box = this.boxIfClientControls(client, boxIndex);
    if (!box) return null;
    if (this.model.get('turn')[1] !== handIndex) return null;
    var hand = _.where(box.hands, { index: handIndex })[0]
    return hand
}

BjMachine.prototype.add = function(client, callback) {
    debug('adding client', client.socket.id)

    var existing = !!_.where(this.clients, { player: client.player })[0]

    debug(util.format(
        'adding %s client %s to %s',
        existing ? 'existing' : 'new',
        client.socket.id,
        this.model.id,
        client.user.model.id
    ))

    this.clients.push(client)

    client.socket.emit('join', this.model.toJSON())

    if (!existing) {
        this.model.get('players').push(client.player)

        // TODO: consider not leaking internal ids
        this.broadcast('players:add', _.pick(client.user.model.toJSON(), '_id', 'username'))
    }

    this.subscribe(client, 'sit', this.onClientSit.bind(this))
    this.subscribe(client, 'bet', this.onClientBet.bind(this))
    this.subscribe(client, 'hit', this.onClientHit.bind(this))
    this.subscribe(client, 'stand', this.onClientStand.bind(this))

    callback && callback()
}

BjMachine.prototype.bet = function(index, satoshi, cb) {
    var self = this
    if (this.model.get('state') !== 'betting') return cb(new Error('not in betting state'))
    if (!_.isNumber(satoshi)) return cb(new Error('bad amount'))
    if (satoshi < 0) return cb(new Error('bad amount'))
    var box = this.model.get('boxes')[index]
    if (!box) return cb(new Error('box not found'))
    if (!box.player) return cb(new Error('box has no player'))

    debug(util.format('player %s wagering %d in box %d', box.player.model.id, satoshi, index))

    box.player.wager(satoshi, 'Blackjack', function(err) {
        if (err) return cb(err)

        box.bet = (box.bet || 0) + satoshi
        self.broadcast('bet', { box: index, bet: satoshi })

        if (!self.endBettingTimer) {
            self.endBettingTimer = setTimeout(function() {
                self.queue(function(leave) {
                    self.deal(leave)
                })
            }, 500)
        }

        cb()
    })
}

BjMachine.prototype.onClientBet = function(client, message, callback) {
    if (arguments.length !== 3) {
        throw new Error('bad argument count')
    }

    if (!this.boxIfClientControls(client, message.box)) {
        callback(new Error('access denied'))
    }

    this.bet(message.box, message.bet, callback)
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

    if (this.model.get('turn')[0] !== box.index) {
        this.send(client, 'error', 'box not on turn');
        return callback();
    }

    if (this.model.get('turn')[1] !== message.hand) {
        this.send(client, 'error', 'hand not on turn');
        return callback();
    }

    this.nextTurn(callback);
}

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

    var card = this.model.get('deck').shift()
    hand.cards.push(card)
    debug(util.format('player hits a %s to a %s', bj.pretty(card), bj.pretty(hand.cards)))
    this.broadcast('hit', card)

    var score = bj.score(hand.cards)

    if (score == 21) {
        debug('player has drawn to 21, auto standing');
        this.nextTurn(callback);
        return;
    }

    if (score > 21) {
        debug('player has busted');
        box.hands.splice(box.hands.indexOf(hand), 1)
        this.nextTurn(callback)
        return
    }

    debug('player has a new sum of ', bj.sum(hand.cards) + ' and can still draw')
    this.broadcast('turn', this.model.get('turn'))

    callback()
}

BjMachine.prototype.deal = function(cb) {
    var self = this

    if (!_.isFunction(cb)) {
        throw new Error('callback missing')
    }

    if (this.model.get('state') !== 'betting') {
        return cb(new Error('bad state'))
    }

    if (self.endBettingTimer) {
        clearTimeout(self.endBettingTimer)
        self.endBettingTimer = null
    }

    debug('shuffling')

    var deck = cards.shuffle()

    this.model.set('deck', deck)

    var boxes = this.model.get('boxes').filter(function(box) {
        return box.player && box.bet
    })

    if (!boxes.length) {
        return cb(new Error('no boxes to deal to'))
    }

    this.model.set('dealer', [deck.shift(), deck.shift()])
    debug(util.format('dealt %s to dealer', bj.pretty(this.model.get('dealer'))))

    debug(util.format('dealing to %d boxes', boxes.length))

    _.each(boxes, function(box) {
        box.splits = 0
        box.hands = [{
            index: 0,
            cards: [deck.shift(), deck.shift()],
            bet: box.bet
        }]

        debug(util.format('dealt %s to box %d', bj.pretty(box.hands[0].cards), box.index))
    })

    this.model.set('turn', null)

    this.broadcast('deal', {
        boxes: boxes.map(function(s) {
            return {
                index: s.index,
                cards: s.hands[0].cards
            }
        }),

        dealer: this.model.get('dealer')[0]
    })

    debug('performing early settlement')

    this.settle(function() {
        debug('early settlement complete, finding next turn')
        self.model.set('state', 'playing')
        self.nextTurn(cb)
    })
}

BjMachine.prototype.getNextTurn = function(turn) {
    turn = turn ? turn.slice(0) : null

    while (true) {
        if (!turn) {
            debug('setting turn to [0, 0]')
            turn = [0, 0];
        } else if (this.model.get('boxes')[turn[0]].splits > turn[1]) {
            debug('active box has more splits, moving to the next')
            turn[1]++;
        } else if (this.model.get('boxes').length > turn[0] + 1) {
            debug('there is a next box, moving to box ' + (turn[0] + 1))
            turn[0]++;
            turn[1] = 0;
        } else {
            debug('there is no next box')
            return null;
        }

        var box = this.model.get('boxes')[turn[0]]
        if (!box) throw new Error('no box ' + turn[0])

        if (!box.hands) {
            debug('box ' + box.index + ' does not have any hands, skipping')
            continue
        }

        var hand = box.hands[turn[1]]

        if (!hand) {
            debug('hand does not exist, skipping')
            continue;
        }

        if (!hand.bet) {
            continue
        }

        if (bj.score(hand.cards) == 21) continue;
        // todo: no hit split aces check

        debug('returning next turn as ' + turn[0] + ', ' + turn[1])

        return turn;
    }
}

BjMachine.prototype.settle = function(callback) {
    if (!_.isFunction(callback)) throw new Error('settle requires callback')

    var self = this
    , dealerScore = bj.score(this.model.get('dealer'))
    , dealerCards = this.model.get('dealer')
    , dealerStanding = this.model.get('state') === 'playing'

    debug('dealer standing? ' + dealerStanding)

    async.forEachSeries(this.model.get('boxes'), function(box, next) {
        if (!box.hands) return next()

        async.forEachSeries(_.clone(box.hands), function(hand, next) {
            if (!hand.cards.length) return next()

            var handScore = bj.score(hand.cards)
            var handCards = hand.cards
            , returned = bj.settle(box.splits, handCards, dealerCards, dealerStanding)

            if (returned === null) {
                debug(util.format('box %d hand %d cannot be settled yet', box.index, hand.index))
                return next()
            }

            returned *= hand.bet

            debug(util.format(
                'settling box %d hand %d with %s vs dealer %s',
                box.index,
                hand.index,
                bj.pretty(hand.cards),
                bj.pretty(self.model.get('dealer'))
            ))

            box.hands.splice(box.hands.indexOf(hand), 1)

            if (returned === 0) {
                debug('nothing returned for box ' + box.index + ' hand ' + hand.index)
                return next()
            }

            box.player.give(returned, 'blackjack', function(err) {
                if (err) {
                    console.error('failed to give user returned amount')
                    console.error(err)
                }

                debug('setted box ' + box.index + ' hand ' + hand.index + ' with ' + (returned / 1e5) + ' credits')

                next()
            })
        }, function() {
            next()
        })
    }, callback)
}

BjMachine.prototype.end = function(callback) {
    if (!_.isFunction(callback)) throw new Error('callback null')

    var self = this
    this.model.set('turn', null)

    this.settle(function() {
        debug('settlement completed, resetting')
        self.model.set('dealer', [])
        self.reset(callback)
    })
}

BjMachine.prototype.open = function(cb) {
    if (!_.isFunction(cb)) throw new Error('callback null')

    var self = this

    debug('dealer opens');

    async.series({
        reveal: function(cb) {
            debug('dealer reveals', bj.pretty(self.model.get('dealer')[1]))
            self.broadcast('dealer:card', { card: self.model.get('dealer')[1] })
            setTimeout(cb, 1000)
        },

        draw: function(cb) {
            async.whilst(
                function() {
                    return bj.score(self.model.get('dealer')) < 17
                },
                function(cb) {
                    var card = self.model.get('deck').pop();
                    self.model.get('dealer').push(card);
                    debug(util.format(
                        'dealer draws %s and has %s',
                        bj.pretty(card),
                        bj.pretty(self.model.get('dealer'))
                    ))

                    self.broadcast('dealer:card', { card: card })
                    setTimeout(cb, 1000)
                },
                cb
            )
        }
    }, function() {
        debug('open completed, ending')
        self.end(cb)
    })
}

BjMachine.prototype.nextTurn = function(cb) {
    var self = this
    if (!_.isFunction(cb)) throw new Error('callback null')

    if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
    }

    debug('getting next turn')

    var turn = this.getNextTurn(this.model.get('turn'));

    debug('got next turn, ' + util.inspect(turn))

    if (turn) {
        this.model.set('turn', turn)
        this.broadcast('turn', turn)

        this.turnTimer = setTimeout(function() {
            self.queue(function(leave) {
                debug('turn has timed out')
                self.nextTurn(leave)
            })
        }, settings.decisionTime);

        cb()
        return
    }

    var challengers = this.model.get('boxes').filter(function(b) {

        // any non-blackjack hand
        return b.hands && b.hands.length && (b.splits > 0 || !bj.isBlackjack(b.hands[0].cards))
    })

    debug('there are ' + challengers.length + ' challengers')

    if (challengers.length) {
        debug('dealer will open to challenge', _.where(this.model.get('boxes'), function(b) { return b.hands.length > 0 }))
        this.model.set('turn', null);
        this.open(cb)
        return;
    } else {
        debug('there are no hands to challenge dealer');
    }

    this.end(cb)
}

module.exports = BjMachine
