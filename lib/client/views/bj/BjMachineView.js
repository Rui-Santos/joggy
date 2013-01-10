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
, BjMachineView = module.exports = MachineView.extend({
    className: 'bj-machine',

    spriteMap: require('../../../../assets/card-sprites.json'),

    assetsLoaded: function() {
        this.table = Table(this.assets, this.$kinetic[0])
        this.table.on('bet', this.onClickBet.bind(this))
        this.table.on('sit', this.onClickSit.bind(this))
        this.table.on('hit', this.onClickHit.bind(this))
        this.table.on('double', this.onClickDouble.bind(this))
        this.table.on('split', this.onClickSplit.bind(this))
        this.table.on('stand', this.onClickStand.bind(this))

        this.toggleActions()
    },

    initialize: function() {
        var self = this
        MachineView.prototype.initialize.apply(this, arguments)

        this.$kinetic = $('<div>').appendTo(this.$el)

        this.subscribe('betting', this.onBetting, this)
        this.subscribe('sit', this.onSit, this)
        this.subscribe('deal', this.onDeal, this)
        this.subscribe('hit', this.onHit, this)
        this.subscribe('double', this.onDouble, this)
        this.subscribe('split', this.onSplit, this)
        this.subscribe('dealer:card', this.onDealerCard, this)
        this.subscribe('turn', this.onTurn, this)

        console.log('loading assets')

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
        var self = this
        this.model.set('state', 'playing')

        _.each(packet.boxes, function(b) {
            var bm = self.model.get('boxes')[b.index]
            bm.hands = [{
                index: 0,
                cards: b.cards,
                bet: bm.bet
            }]
            bm.splits = 0

            var box = self.table.boxes[b.index]
            , hand = box.addHand()
            hand.addCard(b.cards[0])
            hand.addCard(b.cards[1])
        })

        this.model.set('dealer', [packet.dealer])
        this.table.resetDealer(packet.dealer)
        this.toggleActions()

        this.debugStage()

        cb()
    },

    debugStage: function(item, indent) {
        var self = this
        indent || (indent = 0)
        item || (item = self.table)
        console.log(
            _.range(indent).map(function() { return '' }).join('--') +
            ' ' +
            (item.getName() || 'unnamed') +
            ' / ' +
            (item.getId() || 'no id')
        )

        if (!item.getChildren) return

        _.each(item.getChildren(), function(i) {
            self.debugStage(i, indent + 1)
        })
    },

    onDealerCard: function(packet, cb) {
        this.table.dealer.addCard(packet.card)
        cb()
    },

    onSit: function(packet, cb) {
        console.log('player ' + packet.player + ' sitting in box ' + packet.box)
        this.model.get('boxes')[packet.box].player = packet.player
        this.toggleActions()
        cb()
    },

    unsetActiveHand: function() {
        var oldTurn = this.model.get('turn')

        if (oldTurn) {
            var oldHand = this.table.get('#box-' + oldTurn[0] + '-hand-' + oldTurn[1])[0]
            oldHand && oldHand.setActive(false)
        }
    },

    completeTurn: function() {
        this.unsetActiveHand()
        this.model.set('turn', null)
        this.toggleActions()
    },

    onTurn: function(turn, cb) {
        this.unsetActiveHand()

        this.model.set('turn', turn)

        if (turn) {
            var newHand = this.table.get('#box-' + turn[0] + '-hand-' + turn[1])[0]
            newHand.setActive(true)
        }

        this.toggleActions()
        cb()
    },

    onHit: function(packet, cb) {
        var turn = this.model.get('turn')
        , bm = _.where(this.model.get('boxes'), { index: turn[0] })[0]
        , hm = _.where(bm.hands, { index: turn[1] })[0]
        hm.cards.push(packet)

        var box = this.table.boxes[this.model.get('turn')[0]]
        , hand = box.hands[turn[1]]
        hand.addCard(packet)

        this.toggleActions()

        if (bj.score(hm.cards) > 21) {
            this.model.set('turn', null)

            return setTimeout(function() {
                hand.discard(cb)
            }, 1000)
        }

        cb()
    },

    onDouble: function(packet, cb) {
        var self = this
        , turn = this.model.get('turn')
        , bm = _.where(this.model.get('boxes'), { index: turn[0] })[0]
        , hm = _.where(bm.hands, { index: turn[1] })[0]
        hm.cards.push(packet)

        var box = this.table.boxes[this.model.get('turn')[0]]
        , hand = box.hands[turn[1]]
        hand.addCard(packet)

        setTimeout(function() {
            self.toggleActions()
            cb()
        }, 500)
    },

    onSplit: function(packet, cb) {
        var self = this
        , turn = this.model.get('turn')
        , bm = _.where(this.model.get('boxes'), { index: turn[0] })[0]
        , ohm = _.where(bm.hands, { index: turn[1] })[0]
        , nhm = {
            index: ++bm.splits,
            bet: ohm.bet,
            cards: [ohm.cards.pop(), packet.cards[1]]
        }
        bm.hands.push(nhm)
        ohm.cards.push(packet.cards[0])

        var box = this.table.boxes[this.model.get('turn')[0]]
        , oldHand = box.hands[turn[1]]
        box.split(turn[1], packet.cards)

        setTimeout(function() {
            self.toggleActions()
            cb()
        }, 500)
    },

    toggleActions: function(value) {
        var self = this
        , actions = {
            hit: value,
            stand: value,
            double: value,
            split: value
        }

        if (_.isUndefined(value)) {
            if (this.model.get('turn') &&
                this.model.get('boxes')[this.model.get('turn')[0]].player === app.user.id
            ) {
                actions.hit = true
                actions.stand = true

                var turn = this.model.get('turn')
                , bm = _.where(this.model.get('boxes'), { index: turn[0] })[0]
                , hm = _.where(bm.hands, { index: turn[1] })[0]

                actions.double = app.user.get('balance') >= hm.bet &&
                    hm.cards.length === 2 &&
                    turn[1] === 0 || this.model.get('rules').doubleAfterSplit

                actions.split = app.user.get('balance') >= hm.bet &&
                    hm.cards.length === 2 &&
                    bj.value(hm.cards[0]) === bj.value(hm.cards[1]) &&
                    turn[1] < this.model.get('rules').maxSplits
            }
        }

        _.each(actions, function(enabled, name) {
            self.table[name].setVisible(!!enabled)
        })

        _.each(self.model.get('boxes'), function(bm) {
            var box = self.table.boxes[bm.index]

            var canSit = self.model.get('state') === 'betting' &&
                !bm.player

            box.sit.setVisible(canSit)

            var canBet = self.model.get('state') === 'betting' &&
                bm.player === app.user.id &&
                app.user.get('balance') >= 2e5 &&
                !bm.bet

            box.bet.setVisible(canBet)
        })

        self.table.draw()
    },

    onClickSit: function(e) {
        this.send('sit', { box: e.box })
    },

    onClickStand: function(bi, hi) {
        if (!this.model.get('turn')) {
            return console.error('turn not set')
        }

        this.send('stand', {
            box: this.model.get('turn')[0],
            hand: this.model.get('turn')[1]
        })

        this.toggleActions(false)
    },

    onClickSplit: function(bi, hi) {
        if (!this.model.get('turn')) {
            return console.error('turn not set')
        }

        this.send('split', {
            box: this.model.get('turn')[0],
            hand: this.model.get('turn')[1]
        })

        this.toggleActions(false)
    },

    onClickHit: function(e) {
        if (!this.model.get('turn')) {
            return console.error('turn not set')
        }

        this.send('hit', {
            box: this.model.get('turn')[0],
            hand: this.model.get('turn')[1]
        })

        this.toggleActions(false)
    },

    onClickDouble: function(e) {
        if (!this.model.get('turn')) {
            return console.error('turn not set')
        }

        this.send('double', {
            box: this.model.get('turn')[0],
            hand: this.model.get('turn')[1]
        })

        this.toggleActions(false)
    },

    onClickBet: function(e) {
        this.send('bet', { box: e.box, bet: 2e5 })
    },

    size: { w: 1000, h: 800 },

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
            this.table.setWidth(w)
            this.table.setHeight(h)
            this.table.layer.setScale(w / this.size.w, h / this.size.h)
        }
    },

    discard: function(cb) {
        var self = this

        self.model.set('turn', null)
        self.model.set('dealer', null)
        self.toggleActions()

        self.table.discard(cb)
    },

    onBetting: function(packet, cb) {
        var self = this
        self.model.set('turn', null)

        setTimeout(function() {
            self.discard(function() {
                self.model.set('state', 'betting')
                self.toggleActions()
                cb()
            })
        }, 1500)
    },

    render: function() {
        return this;
    }
})

BjMachineView.model = Models.BjMachine
