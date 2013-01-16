var _ = require('underscore')
, util = require('util')
, Machine = require('./Machine')
, bj = require('../../bj')
, Models = require('../../models')
, debug = require('debug')('joggy:bj')
, async = require('async')
, cards = require('../../cards')

var settings = {
    bettingTime: 1000 * 5,
    idleEjectTime: 1000 * 60 * 5,
    maxSeatsPerUser: 2
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
    var self = this

    debug('resetting')

    this.model.set('state', 'betting')
    this.broadcast('betting', {})

    _.each(this.model.get('boxes'), function(box, index) {
        box.bet = 0
        box.hands = null
        box.splits = 0

        if (box.user && box.idleSince + settings.idleEjectTime < +new Date()) {
            debug(util.format('ejecting user from box %d for being idle too long', index))
            self.eject(index)
        }
    })

    cb(null, this)
}

BjMachine.prototype.onClientSit = function(client, packet, cb) {
    if (this.model.get('state') !== 'betting') throw new Error('bad state')
    if (!client.user) throw new Error('client is guest')
    if (arguments.length !== 3) throw new Error('bad argument count')
    if (packet.box % 1 !== 0) throw new Error('bad box')

    var seatCount = _.where(this.model.get('boxes'), { user: client.user }).length

    if (seatCount >= settings.maxSeatsPerUser) {
        client.socket.emit('error', 'max ' + settings.maxSeatsPerUser + ' seats per user')
        return cb()
    }

    var box = this.model.get('boxes')[packet.box]
    if (!box) throw new Error('box not found')
    if (box.user) throw new Error('box taken')

    box.user = client.user
    box.idleSince = +new Date()

    this.broadcast('sit', {
        box: packet.box,
        user: box.user.model.get('username')
    })

    cb()
}

BjMachine.prototype.eject = function(index) {
    var box = this.model.get('boxes')[index]
    if (!box) throw new Error('box does not exist')
    if (!box.user) throw new Error('box is empty')
    if (this.model.get('state') !== 'betting') throw new Error('cannot eject outside betting state')
    box.user = null
    box.idleSince = null
    this.broadcast('eject', { box: index })
}

BjMachine.prototype.onClientEject = function(client, packet, cb) {
    if (!client.user) throw new Error('client is guest')
    if (arguments.length !== 3) throw new Error('bad argument count')
    if (packet.box % 1 !== 0) throw new Error('bad box')

    var box = this.model.get('boxes')[packet.box]
    if (!box) throw new Error('box not found')
    if (box.user === null) throw new Error('box not taken')
    if (box.user !== client.user) throw new Error('user not in box')

    this.eject(packet.box)

    cb()
}

BjMachine.prototype.boxIfClientControls = function(client, boxIndex) {
    var box = this.model.get('boxes')[boxIndex]
    if (_.isUndefined(box)) debug('box bad/missing', boxIndex)
    else if (!box.user) debug('box not occupied')
    else if (box.user.model.id !== client.user.model.id) debug('user does not own box')
    else return box
    return null
}

BjMachine.prototype.handIfClientOnTurn = function(client, boxIndex, handIndex) {
    if (this.model.get('state') != 'playing') return null;
    var box = this.boxIfClientControls(client, boxIndex);
    if (!box) return null;
    if (this.model.get('turn')[1] !== handIndex) return null;
    var hand = box.hands[handIndex]
    return hand
}

BjMachine.prototype.add = function(client, callback) {
    debug('adding client', client.socket.id)

    var existing = !!_.where(this.clients, { user: client.user })[0]

    debug(util.format(
        'adding %s client %s to %s',
        existing ? 'existing' : 'new',
        client.socket.id,
        this.model.id,
        client.user.model.id
    ))

    this.clients.push(client)

    client.socket.emit('join', _.extend(
        _.pick(this.model.toJSON(), '_id', 'state', 'turn', 'rules', 'game'),
        {
            dealer:
                this.model.get('dealer') && this.model.get('dealer').length ?
                [this.model.get('dealer')[0]] :
                null,
            boxes: _.map(this.model.get('boxes'), function(box) {
                if (box.hands && box.hands.length !== box.splits + 1) {
                    throw new Error('box has ' + box.hands.length + ' hands, but splits is set to ' + box.splits)
                }

                return _.extend(
                    _.pick(box, 'bet'),
                    {
                        user: box.user ? box.user.model.get('username') : null,
                        splits: box.splits,
                        hands: box.hands
                    })
            })
        }
    ))

    this.subscribe(client, 'sit', this.onClientSit.bind(this))
    this.subscribe(client, 'bet', this.onClientBet.bind(this))
    this.subscribe(client, 'hit', this.onClientHit.bind(this))
    this.subscribe(client, 'split', this.onClientSplit.bind(this))
    this.subscribe(client, 'double', this.onClientDouble.bind(this))
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
    if (!box.user) return cb(new Error('box has no user'))
    if (box.bet + satoshi > this.model.get('rules').maxBet) return cb(new Error('over max bet'))
    if (satoshi < this.model.get('rules').minBet) return cb(new Error('over max bet'))

    debug(util.format('user %s wagering %d in box %d', box.user.model.id, satoshi, index))

    box.user.wager(satoshi, 'Blackjack', function(err) {
        if (err) return cb(err)

        box.idleSince = +new Date()

        box.bet = (box.bet || 0) + satoshi
        self.broadcast('bet', { box: index, bet: satoshi })

        if (!self.endBettingTimer) {
            self.endBettingTimer = setTimeout(function() {
                self.queue(function(leave) {
                    self.deal(leave)
                })
            }, settings.bettingTime)

            self.broadcast('betting', { duration: settings.bettingTime / 1e3 })
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
    var self = this

    if (this.model.get('state') != 'playing') {
        this.send(client, 'error', 'stand: outside playing state');
        return callback();
    }

    var box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'stand: box check failed');
        return callback();
    }

    if (this.model.get('turn')[0] !== message.box) {
        this.send(client, 'error', 'box not on turn');
        return callback();
    }

    if (this.model.get('turn')[1] !== message.hand) {
        this.send(client, 'error', 'hand not on turn');
        return callback();
    }

    setTimeout(function() {
        self.nextTurn(callback)
    }, 0)
}

BjMachine.prototype.onClientHit = function(client, message, callback) {
    var self = this
    , box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'hit: box check fail');
        return callback();
    }

    var hand = this.handIfClientOnTurn(client, message.box, message.hand);

    if (!hand) {
        this.send(client, 'error', 'hit: hand check fail');
        return callback();
    }

    // there's no need to check for hit split aces rules because
    // the turn should never arrive at a hand in that situation

    var card = this.model.get('deck').shift()
    hand.cards.push(card)
    debug(util.format('user hits a %s to a %s', bj.pretty(card), bj.pretty(hand.cards)))
    this.broadcast('hit', card)

    var score = bj.score(hand.cards)

    if (score == 21) {
        debug('user has drawn to 21, auto standing');

        setTimeout(function() {
            self.nextTurn(callback);
        }, 0)

        return;
    }

    if (score > 21) {
        debug('user has busted');
        box.hands[message.hand] = null

        setTimeout(function() {
            self.nextTurn(callback);
        }, 0)

        return
    }

    debug('user has a new sum of ', bj.sum(hand.cards) + ' and can still draw')
    this.setTurn(this.model.get('turn'))

    callback()
}

BjMachine.prototype.onClientDouble = function(client, message, callback) {
    var self = this
    , box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'double: box check fail');
        return callback();
    }
    var hand = this.handIfClientOnTurn(client, message.box, message.hand);

    if (!hand) {
        this.send(client, 'error', 'double: hand check fail');
        return callback();
    }

    if (box.splits !== 0 && !this.model.get('rules').doubleAfterSplit) {
        this.send(client, 'error', 'double: cannot double');
        return callback();
    }

    if (hand.cards.length > 2) {
        this.send(client, 'error', 'double: cannot double')
        return callback()
    }

    client.user.wager(hand.bet, 'Blackjack double', function(err) {
        if (err) {
            self.send(client, 'error', 'double: failed to take wager');
            return callback()
        }

        hand.bet *= 2

        var card = self.model.get('deck').shift()

        // TODO: generalize deck pop and this error
        if (!card) {
            throw new Error('out of cards')
        }

        hand.cards.push(card)
        debug(util.format('user doubles a %s to a %s', bj.pretty(card), bj.pretty(hand.cards)))
        self.broadcast('double', card)

        var score = bj.score(hand.cards)

        if (score > 21) {
            box.hands[message.hand] = null
        }

        setTimeout(function() {
            self.nextTurn(callback)
        }, 0)
    })
}

BjMachine.prototype.onClientSplit = function(client, message, callback) {
    var self = this
    , box = this.boxIfClientControls(client, message.box);

    if (!box) {
        this.send(client, 'error', 'split: box check fail');
        return callback();
    }

    var hand = this.handIfClientOnTurn(client, message.box, message.hand);

    if (!hand) {
        this.send(client, 'error', 'split: hand check fail');
        return callback();
    }

    if (hand.cards.length !== 2) {
        this.send(client, 'error', 'split: too many cards on hand')
        return callback()
    }

    if (bj.value(hand.cards[0]) !== bj.value(hand.cards[1])) {
        this.send(client, 'error', 'split: values not same')
        return callback()
    }

    if (hand.splits >= this.model.get('rules').maxSplits) {
        this.send(client, 'error', 'split: max splits already')
        return callback()
    }

    client.user.wager(hand.bet, 'Blackjack split', function(err) {
        if (err) {
            self.send(client, 'error', 'split: failed to take wager');
            return callback()
        }

        var cards = [
            self.model.get('deck').shift(),
            self.model.get('deck').shift()
        ]
        , newHand = {
            bet: hand.bet,
            cards: [
                hand.cards.pop(),
                cards[1]
            ]
        }

        box.hands.push(newHand)
        box.splits++

        hand.cards.push(cards[0])

        self.broadcast('split', {
            cards: cards
        })

        if (bj.value(hand.cards[0]) === 1) {
            // re-split aces when:
            // re-split aces is allowed
            // hand has exactly two aces
            // box is not at max re-split
            // user has funds (optional, will be checked when user attempts to split)
            if (self.model.get('rules').reSplitAces === true &&
                bj.score(hand.cards) === 2 &&
                box.splits < self.model.get('rules').maxSplits &&
                client.user.get('balance') >= hand.bet
            ) {
                self.setTurn(self.model.get('turn'))
                callback()
                return
            } else if (self.model.get('rules').hitSplitAces &&
                bj.score(hand.cards) !== 21
            ) {
                self.setTurn(self.model.get('turn'))
                callback()
                return
            }

            self.nextTurn(callback)
            return
        }

        if (bj.score(hand.cards) === 21) {
            return self.nextTurn(callback)
        }

        self.setTurn(self.model.get('turn'))
        callback()
    })
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
        return box.user && box.bet
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
            cards: [deck.shift(), deck.shift()],
            bet: box.bet
        }]

        debug(util.format('dealt %s to box %d', bj.pretty(box.hands[0].cards), self.model.get('boxes').indexOf(box)))
    })

    this.model.set('turn', null)

    this.broadcast('deal', {
        boxes: _.map(boxes, function(box) {
            return {
                index: self.model.get('boxes').indexOf(box),
                cards: box.hands[0].cards
            }
        }),

        dealer: [this.model.get('dealer')[0]]
    })

    // insurance is not possible, dealer checks for BJ
    var dealerBj = bj.isBlackjack(this.model.get('dealer'))

    if (dealerBj) {
        self.open(cb)
    } else {
        debug('performing early settlement')

        self.settle(function() {
            self.model.set('state', 'playing')
            self.nextTurn(cb)
        })
    }
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
            debug('box ' + turn[0] + ' does not have any hands, skipping')
            continue
        }

        var hand = box.hands[turn[1]]

        debug('looking at box ' + turn[0] + ' hand ' + turn[1])

        if (!hand) {
            debug('hand does not exist, skipping')
            continue;
        }

        if (!hand.bet) {
            debug('skipping hand with no bet')
            continue
        }

        if (bj.score(hand.cards) === 21) {
            debug('skipping hand with score 21 (' + bj.values(hand.cards).join() + ')')
            continue;
        }

        if (box.splits &&
            bj.value(hand.cards[0]) === 1 &&
            this.model.get('rules').hitSplitAces === false
        ) {
            debug('skipping hand with split aces (hit split aces is off)')
            continue
        }

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

        var boxIndex = self.model.get('boxes').indexOf(box)

        async.forEachSeries(_.clone(box.hands), function(hand, next) {
            if (!hand || !hand.cards.length) return next()

            var handScore = bj.score(hand.cards)
            , handCards = hand.cards
            , returned = bj.settle(box.splits, handCards, dealerCards, dealerStanding)
            , handIndex = box.hands.indexOf(hand)

            if (returned === null) {
                debug(util.format('box %d hand %d cannot be settled yet', boxIndex, handIndex))
                return next()
            }

            returned *= hand.bet

            debug(util.format(
                'settling box %d hand %d with %s vs dealer %s',
                boxIndex,
                handIndex,
                bj.pretty(hand.cards),
                bj.pretty(self.model.get('dealer'))
            ))

            box.hands[handIndex] = null

            if (returned === 0) {
                debug('nothing returned for box ' + boxIndex + ' hand ' + handIndex)
                return next()
            }

            box.user.give(returned, 'blackjack', function(err) {
                if (err) {
                    console.error('failed to give user returned amount')
                    console.error(err)
                }

                debug('setted box ' + boxIndex + ' hand ' + handIndex + ' with ' + (returned / 1e5) + ' credits')

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

BjMachine.prototype.revealHoleCard = function(cb) {
    debug('dealer reveals', bj.pretty(this.model.get('dealer')[1]))
    this.broadcast('dealer:card', { card: this.model.get('dealer')[1] })
    cb && cb()
}

BjMachine.prototype.dealerDrawOne = function(cb) {
    var card = this.model.get('deck').pop();
    this.model.get('dealer').push(card);

    debug(util.format(
        'dealer draws %s and has %s',
        bj.pretty(card),
        bj.pretty(this.model.get('dealer'))
    ))

    this.broadcast('dealer:card', { card: card })
    setTimeout(cb, 0)
}

BjMachine.prototype.dealerNeedsToDraw = function() {
    var dealer = this.model.get('dealer')
    , soft17 = bj.isSoft(dealer) && bj.score(dealer) === 17

    if (soft17) {
        return this.model.get('rules').hitSoft17
    }

    return bj.score(dealer) < 17
}

BjMachine.prototype.dealerDraw = function(cb) {
    async.whilst(
        this.dealerNeedsToDraw.bind(this),
        this.dealerDrawOne.bind(this),
        cb
    )
}

BjMachine.prototype.open = function(cb) {
    var self = this
    if (!_.isFunction(cb)) throw new Error('callback null')

    debug('dealer opens');

    async.series([
        this.revealHoleCard.bind(this),
        this.dealerDraw.bind(this)
    ], function() {
        self.end(cb)
    })
}

BjMachine.prototype.setTurn = function(turn) {
    var self = this
    this.model.set('turn', turn)
    this.broadcast('turn', turn)

    if (turn) {
        this.turnTimer && clearTimeout(this.turnTimer)

        this.turnTimer = setTimeout(function() {
            self.queue(function(leave) {
                debug('turn has timed out')
                self.nextTurn(leave)
            })
        }, this.model.get('rules').decisionTime * 1000)
    }
}

BjMachine.prototype.nextTurn = function(cb) {
    var self = this
    if (!_.isFunction(cb)) throw new Error('callback null')

    if (this.turnTimer) {
        clearTimeout(this.turnTimer);
        this.turnTimer = null;
    }

    debug('getting next turn')

    var turn = bj.isBlackjack(this.model.get('dealer')) ?
        null :
        this.getNextTurn(this.model.get('turn'))

    debug('got next turn, ' + util.inspect(turn))

    if (turn) {
        this.setTurn(turn)
        cb()
        return
    }

    var challengers = this.model.get('boxes').filter(function(b) {
        // any hand that cannot be settled
        return b.hands && _.any(b.hands, function(h) {
            if (!h) return false
            if (bj.settle(b.splits, h.cards, [self.model.get('dealer')[0]], false) === null) return true
            if (bj.isBlackjack(self.model.get('dealer')) && bj.isBlackjack(h.cards)) return true
            return false
        })
    })

    debug('there are ' + challengers.length + ' challengers')

    if (challengers.length) {
        debug('dealer will open to challenge ' + challengers.length + ' boxes')
        this.setTurn(null)
        this.open(cb)
        return;
    } else {
        debug('there are no hands to challenge dealer');
    }

    this.end(cb)
}

module.exports = BjMachine
