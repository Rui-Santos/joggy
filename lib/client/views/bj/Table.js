var Box = require('./Box')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, _ = require('underscore')
, async = require('async')
, Cards = require('./Cards')
, bj = require('../../../bj')
, Table = module.exports = function(assets, container, user) {
    var self = this
    this.assets = assets

    this.stage = new Kinetic.Stage({
        container: container,
        width: 1000,
        height: 800
    })

    this.user = user

    this.layer = new Kinetic.Layer()
    this.stage.add(this.layer)

    // background
    this.layer.add(new Kinetic.Rect({
        id: 'background',
        width: this.stage.getWidth(),
        height: this.stage.getHeight(),
        fill: '#009900'
    }))

    this.balance = new Kinetic.Text({
        textFill: 'white',
        x: this.stage.getWidth() - 180,
        y: 10,
        fontSize: 18
    })
    this.layer.add(this.balance)

    this.createBoxes()
    this.createButtons()

    this.layer.draw()
}

util.inherits(Table, EventEmitter)

Table.prototype.deal = function(data, cb) {
    var self = this
    , delayBetweenCards = cb ? 200 : 0

    async.series({
        boxes1: function(next) {
            async.forEachSeries(data.boxes, function(b, next) {
                var box = self.boxes[b.index]
                box.deal()
                box.hands[0].add(b.cards[0])
                setTimeout(next, delayBetweenCards)
            }, next)
        },

        dealer1: function(next) {
            self.dealer = new Cards(self.assets)
            self.dealer.node.setY(50)
            self.dealer.node.setX(150)
            self.layer.add(self.dealer.node)
            self.dealer.add(data.dealer[0])
            setTimeout(next, delayBetweenCards)
        },

        boxes2: function(next) {
            async.forEachSeries(data.boxes, function(b, next) {
                var box = self.boxes[b.index]
                box.hands[0].add(b.cards[1])
                setTimeout(next, delayBetweenCards)
            }, next)
        },

        dealer2: function(next) {
            if (data.dealer.length >= 2) {
                self.dealer.add(data.dealer[1])
            }

            next()
        },

        settle: function(next) {
            self.settle(data.dealer.length === 2, next)
        }
    }, cb)
}

Table.prototype.setTurn = function(turn, cb) {
    var self = this

    // remove previous active arrow
    _.each(this.boxes, function(box) {
        _.each(box.hands, function(hand) {
            if (!hand) return
            hand.activeArrow.setVisible(false)
        })
    })

    if (turn) {
        var hand = this.boxes[turn[0]].hands[turn[1]]
        hand.activeArrow.setVisible(true)
    }

    this.layer.draw()

    cb && cb()
}

Table.prototype.disableActions = function(cb) {
    var self = this
    _.each(['hit', 'stand', 'double', 'split'], function(n) {
        self.toggleAction(n, false)
    })
}

Table.prototype.settle = function(dealerStanding, cb) {
    var self = this
    , dealer = this.dealer ? _.pluck(this.dealer.cards, 'value') : []
    , anySettled = false

    async.series({
        boxes: function(next) {
            async.forEach(self.boxes, function(box, next) {
                async.forEach(box.hands, function(hand, next) {
                    if (!hand) return next()
                    if (!hand.cards) {
                        console.log(hand)
                        throw new Error('null cards')
                    }

                    var returned = bj.settle(
                        box.splits,
                        _.pluck(hand.cards.cards, 'value'),
                        dealer,
                        dealerStanding
                    )

                    if (returned === null) return next()

                    // hand out chips

                    box.hands[box.hands.indexOf(hand)] = null
                    hand.discard(next)
                }, next)
            }, next)
        },

        dealer: function(next) {
            if (dealerStanding) {
                if (self.dealer) {
                    self.dealer.discard(next)
                    self.dealer = null
                } else {
                    next()
                }
            } else {
                next()
            }
        }
    }, cb)
}

Table.prototype.resetDealer = function(value) {
    this.dealer && this.dealer.remove()
    this.dealer = new Cards(assets, 0)

    this.dealer.setAttrs({
        x: 300,
        y: 25,
        name: 'dealer',
        id: 'dealer'
    })

    value = _.isArray(value) ? value : [value]
    this.layer.add(this.dealer)
    this.dealer.addCard(value)
}

Table.prototype.discard = function(cb) {
    var self = this

    async.parallel({
        dealer: function(next) {
            self.dealer ? self.dealer.discard(next) : next()
            self.dealer = null
        },

        boxes: function(next) {
            async.forEach(self.boxes, function(box) {
                box.discard(next)
            }, next)
        }
    }, function() {
        self.dealer = null
        cb()
    })
}

Table.prototype.toggleAction = function(name, enabled) {
    this[name].setVisible(enabled)
}

Table.prototype.createButtons = function() {
    function createButton(attrs) {
        return new Kinetic.Text(_.extend({
            padding: 20,
            textFill: 'white',
            width: 120,
            align: 'center',
            stroke: 'white',
            fill: '#007700',
            fontSize: 20,
            y: 722,
            visible: false
        }, attrs))
    }

    var self = this
    , buttonOffset = 250

    this.double = createButton({
        id: 'double',
        text: 'DOUBLE',
        x: buttonOffset,
        name: 'double'
    })

    this.double.on('click', function() {
        self.emit('double')
    })

    buttonOffset += 120

    this.layer.add(this.double)

    this.hit = createButton({
        id: 'hit',
        text: 'HIT',
        x: buttonOffset,
        name: 'hit'
    })

    this.hit.on('click', function() {
        self.emit('hit')
    })

    buttonOffset += 120

    this.layer.add(this.hit)

    this.stand = createButton({
        id: 'stand',
        text: 'STAND',
        x: buttonOffset,
        name: 'stand'
    })

    this.stand.on('click', function() {
        self.emit('stand')
    })

    buttonOffset += 120

    this.layer.add(this.stand)

    this.split = createButton({
        id: 'split',
        text: 'SPLIT',
        x: buttonOffset,
        name: 'split'
    })

    this.split.on('click', function() {
        self.emit('split')
    })

    this.layer.add(this.split)
}

Table.prototype.createBoxes = function() {
    var self = this
    , spacer = 180
    , offset = { x: 120, y: 450 }
    , boxGrid = [
        { x: offset.x + spacer * 4, y: offset.y },
        { x: offset.x + spacer * 3, y: offset.y + 130 },
        { x: offset.x + spacer * 2, y: offset.y + 170 },
        { x: offset.x + spacer * 1, y: offset.y + 130 },
        { x: offset.x + spacer * 0, y: offset.y }
    ]

    this.boxes = _.map(_.range(5), function(bi) {
        var box = new Box(self.assets)

        box.node.on('click', function() {
            self.emit('box', { box: bi })
        })

        box.node.setX(boxGrid[bi].x)
        box.node.setY(boxGrid[bi].y)

        self.layer.add(box.node)

        return box
    })
}
