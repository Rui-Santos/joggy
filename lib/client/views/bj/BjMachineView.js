var Backbone = require('backbone')
, Models = require('../../../models')
, app = require('../../app')
, _ = require('underscore')
, rwb = require('../../rwb')
, bj = require('../../bj')
, cu = require('../../canvas')
, MachineView = require('../MachineView')
, Box = require('./Box')
, Cards = require('./Cards')
, Table = require('./Table')
, debug = require('debug')('joggy:client:views:bj:BjMachineView')
, BjMachineView = module.exports = MachineView.extend({
    className: 'bj-machine',

    spriteMap: require('../../../../assets/card-sprites.json'),

    assetsLoaded: function() {
        var self = this

        this.table = new Table(this.assets, this.$kinetic[0], this.model.toJSON())

        var w = this.$el.width()
        , h = this.$el.height()

        this.rect(0, 0, w, h)

        this.bindTo(this.table, 'box', this.onClickBox.bind(this))
        this.bindTo(this.table, 'hit', this.onClickHit.bind(this))
        this.bindTo(this.table, 'double', this.onClickDouble.bind(this))
        this.bindTo(this.table, 'split', this.onClickSplit.bind(this))
        this.bindTo(this.table, 'stand', this.onClickStand.bind(this))

        this.bindTo(app.user, 'change:balance', function() {
            self.table.balance.setText(Math.floor(app.user.get('balance') / 1e5) + ' CREDITS')
        })

        var model = this.model.toJSON()

        _.each(model.boxes, function(boxState, bi) {
            var box = self.table.boxes[bi]
            box.bet.chips = boxState.bet ? boxState.bet / 1e5 : 0
            box.setUser(boxState.user || null, boxState.user && app.user && boxState.user === app.user.get('username'))
            box.splits = boxState.splits

            _.each(boxState.hands, function(handState, hi) {
                // busted/settled previously
                if (!handState) {
                    box.hands.push(null)
                    return
                }

                var hand = box.addHand()

                box.bet.chips = 0
                hand.bet.chips = handState.bet / 1e5

                _.each(handState.cards, function(index) {
                    hand.add(index)
                })
            })
        })

        this.state = model.state
        this.rules = this.table.rules = model.rules
        this.turn = model.turn
        this.table.setTurn(model.turn)

        if (model.dealer) {
            // dealer will only ever have one card
            this.table.resetDealer(model.dealer[0])
        }

        this.toggleActions()
    },

    toggleActions: function() {
        var self = this

        // can sit?
        _.each(this.table.boxes, function(box) {
            box.label.setVisible(self.state === 'betting')
        })

        this.table.disableActions()

        if (!this.turn) {
            this.table.disableActions()
            this.table.layer.draw()
            return
        }

        var box = this.table.boxes[this.turn[0]]
        , hand = box.hands[this.turn[1]]

        if (box.user !== app.user.get('username')) {
            this.table.disableActions()
            this.table.layer.draw()
            return
        }

        this.table.toggleAction('hit', true)
        this.table.toggleAction('stand', true)

        var canDouble =
            hand.cards.cards.length === 2 &&
            app.user.get('balance') >= hand.bet.chips &&
            (box.splits === 0 || this.rules.doubleAfterSplit)

        this.table.toggleAction('double', canDouble)

        var canSplit = box.splits < this.rules.maxSplits &&
            hand.cards.cards.length === 2 &&
            bj.value(hand.cards.cards[0].value) === bj.value(hand.cards.cards[1].value) &&
            app.user.get('balance') >= hand.bet.chips

        this.table.toggleAction('split', canSplit)

        self.table.layer.draw()
    },

    initialize: function() {
        var self = this
        MachineView.prototype.initialize.apply(this, arguments)

        this.$kinetic = $('<div>').appendTo(this.$el)

        this.subscribe('betting', this.onBetting, this)
        this.subscribe('sit', this.onSit, this)
        this.subscribe('eject', this.onEject, this)
        this.subscribe('deal', this.onDeal, this)
        this.subscribe('bet', this.onBet, this)
        this.subscribe('hit', this.onHit, this)
        this.subscribe('double', this.onDouble, this)
        this.subscribe('split', this.onSplit, this)
        this.subscribe('dealer:card', this.onDealerCard, this)
        this.subscribe('turn', this.onTurn, this)

        debug('loading assets')

        // load assets while maintaining lock
        self.queue(function(leave) {
            cu.loadAssets({
                cards: '/media/cards.png'
            }, function (err, a) {
                if (err) throw err
                self.assets = a
                self.assetsLoaded()
                leave()
            })
        })
    },

    onDeal: function(packet, cb) {
        this.table.deal(packet, cb)
    },

    onDealerCard: function(packet, cb) {
        this.table.dealer.add(packet.card)

        setTimeout(function() {
            cb()
        }, 750)
    },

    onSit: function(packet, cb) {
        var box = this.table.boxes[packet.box]
        box.setUser(packet.user || null, packet.user && app.user && packet.user === app.user.get('username'))
        box.node.getLayer().draw()

        cb()
    },

    onEject: function(packet, cb) {
        var box = this.table.boxes[packet.box]
        box.setUser(null)
        box.node.getLayer().draw()

        cb()
    },

    onTurn: function(turn, cb) {
        var self = this

        // settles uncontested blackjacks
        this.table.settle(false, function() {
            if (turn && !self.turn) {
                self.state = 'playing'
            }

            self.table.setTurn(turn)
            self.turn = turn

            self.toggleActions()

            cb()
        })
    },

    onHit: function(packet, cb) {
        var self = this
        , box = this.table.boxes[this.turn[0]]
        , hand = box.hands[this.turn[1]]
        hand.add(packet)

        var values = _.pluck(hand.cards.cards, 'value')

        setTimeout(function() {
            self.table.settle(false, cb)
        }, 0)
    },

    onDouble: function(packet, cb) {
        var self = this
        , box = this.table.boxes[this.turn[0]]

        if (!box) {
            console.error(this.turn)
            throw new Error('cannot find a box for the current turn')
        }

        var hand = box.hands[this.turn[1]]

        if (!hand) {
            console.error(this.turn)
            throw new Error('cannot find a hand for the current turn')
        }

        hand.bet.chips *= 2
        hand.add(packet)

        var values = _.pluck(hand.cards.cards, 'value')

        setTimeout(function() {
            self.table.settle(false, cb)
        }, 0)
    },

    onSplit: function(packet, cb) {
        var self = this
        , box = this.table.boxes[this.turn[0]]
        box.split(this.turn[1], packet.cards, cb)
    },

    onBet: function(packet, cb) {
        var box = this.table.boxes[packet.box]
        box.bet.chips = (box.bet.chips || 0) + packet.bet / 1e5
        box.node.getLayer().draw()

        cb()
    },

    onBetting: function(packet, cb) {
        var self = this
        this.turn = null
        this.table.setTurn(null)
        this.state = 'betting'
        this.table.disableActions()
        this.table.settle(true, function() {
            self.toggleActions()

            if (packet.duration) {
                self.table.bettingTimer.start(packet.duration)
            }

            cb()
        })
    },

    onClickStand: function(bi, hi) {
        this.send('stand', {
            box: this.turn[0],
            hand: this.turn[1]
        })

        this.table.disableActions()
    },

    onClickSplit: function(bi, hi) {
        this.send('split', {
            box: this.turn[0],
            hand: this.turn[1]
        })

        this.table.disableActions()
    },

    onClickHit: function(e) {
        this.send('hit', {
            box: this.turn[0],
            hand: this.turn[1]
        })

        this.table.disableActions()
    },

    onClickDouble: function(e) {
        this.send('double', {
            box: this.turn[0],
            hand: this.turn[1]
        })

        this.table.disableActions()
    },

    onClickBox: function(e) {
        var box = this.table.boxes[e.box]

        if (this.state === 'betting' && !box.user && app.user.get('username')) {
            this.send('sit', { box: e.box })
        } else if (this.state === 'betting' && app.user && box.user === app.user.get('username')) {
            this.send('bet', { box: e.box, bet: 2e5 })
        }
    },

    size: { w: 1000, h: 700 },

    rect: function(x, y, width, height) {
        this.$el.css({
            width: width,
            height: height
        })

        var scale = this.size.w / this.size.h
        , w = width / height > scale ? height * scale : width
        , h = width / height < scale ? width / scale : height

        this.$kinetic.css({
            'margin-left': width > w ? (width - w) / 2 : 0
        })

        if (this.table) {
            this.table.stage.setWidth(w)
            this.table.stage.setHeight(h)
            this.table.layer.setScale(w / this.size.w, h / this.size.h)
        }
    },

    render: function() {
        return this;
    }
})

BjMachineView.model = Models.BjMachine
