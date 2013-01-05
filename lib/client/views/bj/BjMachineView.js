var Backbone = require('backbone')
, Models = require('../../models')
, app = require('../app')
, _ = require('underscore')
, rwb = require('../../rwb')
, bj = require('../../bj')
, cu = require('../canvas')
, MachineView = require('./MachineView')
, BjMachineView = module.exports = MachineView.extend({
    className: 'bj-machine',

    spriteMap: JSON.parse('[{"x":250,"y":0,"width":250,"height":363,"filename":"as.png"},{"x":1500,"y":726,"width":250,"height":363,"filename":"2s.png"},{"x":500,"y":0,"width":250,"height":363,"filename":"3s.png"},{"x":0,"y":363,"width":250,"height":363,"filename":"4s.png"},{"x":250,"y":363,"width":250,"height":363,"filename":"5s.png"},{"x":500,"y":363,"width":250,"height":363,"filename":"6s.png"},{"x":750,"y":0,"width":250,"height":363,"filename":"7s.png"},{"x":750,"y":363,"width":250,"height":363,"filename":"8s.png"},{"x":1000,"y":0,"width":250,"height":363,"filename":"9s.png"},{"x":1000,"y":363,"width":250,"height":363,"filename":"ts.png"},{"x":0,"y":726,"width":250,"height":363,"filename":"js.png"},{"x":250,"y":726,"width":250,"height":363,"filename":"qs.png"},{"x":500,"y":726,"width":250,"height":363,"filename":"ks.png"},{"x":750,"y":726,"width":250,"height":363,"filename":"ah.png"},{"x":1000,"y":726,"width":250,"height":363,"filename":"2h.png"},{"x":1250,"y":0,"width":250,"height":363,"filename":"3h.png"},{"x":1250,"y":363,"width":250,"height":363,"filename":"4h.png"},{"x":1250,"y":726,"width":250,"height":363,"filename":"5h.png"},{"x":0,"y":1089,"width":250,"height":363,"filename":"6h.png"},{"x":250,"y":1089,"width":250,"height":363,"filename":"7h.png"},{"x":500,"y":1089,"width":250,"height":363,"filename":"8h.png"},{"x":750,"y":1089,"width":250,"height":363,"filename":"9h.png"},{"x":1000,"y":1089,"width":250,"height":363,"filename":"th.png"},{"x":1250,"y":1089,"width":250,"height":363,"filename":"jh.png"},{"x":1500,"y":0,"width":250,"height":363,"filename":"qh.png"},{"x":1500,"y":363,"width":250,"height":363,"filename":"kh.png"},{"x":0,"y":0,"width":250,"height":363,"filename":"ad.png"},{"x":1500,"y":1089,"width":250,"height":363,"filename":"2d.png"},{"x":1750,"y":0,"width":250,"height":363,"filename":"3d.png"},{"x":1750,"y":363,"width":250,"height":363,"filename":"4d.png"},{"x":1750,"y":726,"width":250,"height":363,"filename":"5d.png"},{"x":1750,"y":1089,"width":250,"height":363,"filename":"6d.png"},{"x":0,"y":1452,"width":250,"height":363,"filename":"7d.png"},{"x":250,"y":1452,"width":250,"height":363,"filename":"8d.png"},{"x":500,"y":1452,"width":250,"height":363,"filename":"9d.png"},{"x":750,"y":1452,"width":250,"height":363,"filename":"td.png"},{"x":1000,"y":1452,"width":250,"height":363,"filename":"jd.png"},{"x":1250,"y":1452,"width":250,"height":363,"filename":"qd.png"},{"x":1500,"y":1452,"width":250,"height":363,"filename":"kd.png"},{"x":1750,"y":1452,"width":250,"height":363,"filename":"ac.png"},{"x":2000,"y":0,"width":250,"height":363,"filename":"2c.png"},{"x":2000,"y":363,"width":250,"height":363,"filename":"3c.png"},{"x":2000,"y":726,"width":250,"height":363,"filename":"4c.png"},{"x":2000,"y":1089,"width":250,"height":363,"filename":"5c.png"},{"x":2000,"y":1452,"width":250,"height":363,"filename":"6c.png"},{"x":0,"y":1815,"width":250,"height":363,"filename":"7c.png"},{"x":250,"y":1815,"width":250,"height":363,"filename":"8c.png"},{"x":500,"y":1815,"width":250,"height":363,"filename":"9c.png"},{"x":750,"y":1815,"width":250,"height":363,"filename":"tc.png"},{"x":1000,"y":1815,"width":250,"height":363,"filename":"jc.png"},{"x":1250,"y":1815,"width":250,"height":363,"filename":"qc.png"},{"x":1500,"y":1815,"width":250,"height":363,"filename":"kc.png"},{"x":1750,"y":1815,"width":250,"height":363,"filename":"back.png"}]'),

    initialize: function() {
        var self = this

        MachineView.prototype.initialize.apply(this, arguments)

        console.log('initializing bj machine')

        self.assets = null

        cu.loadAssets({
            cards: '/media/job/symbols-large.png?v1'
        }, function (err, a) {
            if (err) throw err
            self.assets = a
        })

        this.vm = new Backbone.Model({
        })

        this.subscribe('betting', this.onBetting, this)
        this.subscribe('sit', this.onSit, this)
        this.subscribe('deal', this.onDeal, this)
        this.subscribe('hit', this.onHit, this)
        this.subscribe('dealer:card', this.onDealerCard, this)
        this.subscribe('turn', this.onTurn, this)

        this.$kinetic = $('<div>').appendTo(this.$el)

        this.stage = new Kinetic.Stage({
            container: this.$kinetic[0]
        })

        this.layer = new Kinetic.Layer()
        this.stage.add(this.layer)

        this.layer.add(new Kinetic.Rect({
            id: 'background',
            width: this.size.w,
            height: this.size.h,
            fill: '#009900'
        }))

        var boxOptions = [{
            x: 800,
            y: 500
        }, {
            x: 650,
            y: 600
        }, {
            x: 450,
            y: 650
        }, {
            x: 250,
            y: 600
        }, {
            x: 100,
            y: 500
        }]

        this.boxes = _.map(this.model.get('boxes'), function(box) {
            var group = new Kinetic.Group(_.extend({
                name: 'box-' + box.index
            }, boxOptions[box.index]))

            group.add(new Kinetic.Rect({
                width: 1,
                height: 1,
                stroke: 'white'
            }))

            var sit = group.sit = new Kinetic.Text({
                text: 'Sit',
                name: 'sit',
                textFill: 'white',
                stroke: 'white',
                padding: 10
            })

            sit.on('click', function() {
                self.onClickSit(box)
            })

            group.add(sit)

            var bet = group.bet = new Kinetic.Text({
                text: 'Bet',
                name: 'bet',
                textFill: 'white',
                stroke: 'white',
                padding: 10
            })

            bet.on('click', function() {
                self.onClickBet(box)
            })

            group.add(bet)

            self.layer.add(group)

            return group
        })

        this.dealer = new Kinetic.Group({
            id: 'dealer',
            x: 200,
            y: 20
        })

        this.layer.add(this.dealer)

        this.toggleButtons()
    },

    onDeal: function(packet, cb) {
        var self = this
        this.model.set('state', 'playing')
        this.toggleButtons()

        _.each(packet.boxes, function(b) {
            var boxModel = self.model.get('boxes')[b.index]
            boxModel.hands = [{
                index: 0,
                cards: b.cards
            }]

            self.addCardToHand(b.index, 0, b.cards[0])
            self.addCardToHand(b.index, 0, b.cards[1])
        })

        this.model.set('dealer', [packet.dealer])
        this.addCardToDealer(packet.dealer)

        this.stage.draw()

        this.debugStage()

        cb()
    },

    debugStage: function(item, indent) {
        var self = this
        indent || (indent = 0)
        item || (item = self.stage)
        console.log(
            _.range(indent).map(function() { return '' }).join('--') +
            ' ' +
            item.getName() || 'unnamed'
        )

        if (!item.getChildren) return

        _.each(item.getChildren(), function(i) {
            self.debugStage(i, indent + 1)
        })
    },

    onDealerCard: function(packet, cb) {
        this.addCardToDealer(packet.card)
        cb()
    },

    createCardImage: function(card, width) {
        var image = cu.kineticImageFromSpriteMap(this.assets.cards, this.spriteMap, bj.pretty(card) + '.png')
        image.setWidth(width)
        image.setHeight(width / (250 / 353))
        return image
    },

    addHandToBox: function(bi) {
        var self = this
        , bg = this.stage.get('.box-' + bi)[0]
        , hi = bg.get('.hand').length
        , hg = new Kinetic.Group({
            name: 'hand-' + hi,
            y: -20
        })

        hg.add(new Kinetic.Group({
            name: 'cards'
        }))

        var actionGroup = new Kinetic.Group({
            y: 100,
            name: 'actions'
        })

        hg.add(actionGroup)

        var hit = new Kinetic.Text({
            text: 'hit',
            name: 'hit',
            textFill: 'white',
            stroke: 'white',
            padding: 10
        })

        hit.on('click', function() {
            self.onClickHit(bi, hi)
        })

        actionGroup.add(hit)

        var stand = new Kinetic.Text({
            text: 'stand',
            name: 'stand',
            textFill: 'white',
            stroke: 'white',
            padding: 10
        })

        stand.on('click', function() {
            self.onClickStand(bi, hi)
        })

        actionGroup.add(stand)

        bg.add(hg)

        return hg
    },

    addCardToHand: function(bi, hi, card) {
        var bg = this.stage.get('.box-' + bi)[0]
        , hg = bg.get('.hand-' + hi)[0] || this.addHandToBox(bi)
        console.log(hg)

        var cards = hg.get('.cards')[0]

        var bm = _.where(this.model.get('boxes'), { index: bi })[0]
        , hm = _.where(bm.hands, { index: hi })[0]
        hm.cards.push(card)

        var image = this.createCardImage(card, 100)
        image.setX(20 * (hm.cards.length - 1))
        image.setY(-30 * (hm.cards.length - 1))
        cards.add(image)
        this.stage.draw()
    },

    addCardToDealer: function(card) {
        this.model.get('dealer').push(card)

        var image = this.createCardImage(card, 100)
        image.setX(120 * (this.model.get('dealer').length - 1))

        this.dealer.add(image)
        this.stage.draw()
    },

    onSit: function(packet, cb) {
        console.log('player ' + packet.player + ' sitting in box ' + packet.box)
        this.model.get('boxes')[packet.box].player = packet.player
        this.toggleButtons()
        cb()
    },

    onTurn: function(packet, cb) {
        this.model.set('turn', packet)
        this.toggleButtons()
        cb()
    },

    onHit: function(packet, cb) {
        var bm = _.where(this.model.get('boxes'), { index: this.model.get('turn')[0] })[0]
        , hm = _.where(bm.hands, { index: this.model.get('turn')[1] })[0]
        hm.cards.push(packet)

        this.addCardToHand(bm.index, hm.index, packet)

        this.toggleButtons()
        cb()
    },

    toggleButtons: function() {
        var self = this

        _.each(self.model.get('boxes'), function(box) {
            var bg = self.boxes[box.index]

            bg.sit.setVisible(self.model.get('state') === 'betting' && !box.player)
            bg.bet.setVisible(self.model.get('state') === 'betting' && box.player === app.user.id)

            var bot = self.model.get('turn') && self.model.get('turn')[0] === box.index

            _.each(box.hands, function(hm) {
                var hg = bg.get('.hand-' + hm.index)[0]
                , hot = self.model.get('state') === 'playing' && bot && self.model.get('turn')[1] === hm.index
                , ag = hg.get('.actions')[0]
                , actions = {
                    hit: hot,
                    stand: hot
                }
                , n = 0

                _.each(actions, function(visible, name) {
                    var button = ag.get('.' + name)[0]
                    if (!button) throw new Error('button ' + name + ' not found')
                    button.setVisible(visible)
                    if (!visible) return
                    button.setX(50 * n)
                    n++
                })
            })
        })

        self.stage.draw()
    },

    onClickSit: function(box) {
        this.send('sit', { box: box.index })
    },

    onClickStand: function(bi, hi) {
        this.send('stand', { box: bi, hand: hi })
    },

    onClickHit: function(bi, hi) {
        this.send('hit', { box: bi, hand: hi })
    },

    onClickBet: function(box) {
        this.send('bet', { box: box.index, bet: 1 })
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

        this.stage.setWidth(w)
        this.stage.setHeight(h)
        this.layer.setScale(w / this.size.w, h / this.size.h)
    },

    discard: function(cb) {
        var self = this

        self.model.set('dealer', null)

        if (self.dealerGroup) {
            self.dealerGroup.remove()
            self.dealerGroup = null
        }

        _.each(self.model.get('boxes'), function(bm) {
            var bg = self.boxes[bm.index]

            _.each(bm.hands, function(hm) {
                var hg = self.stage.get('.box-' + bm.index)[0].get('.hand-' + hm.index)[0]
                if (!hg) throw new Error('hand group not found')
                hg.remove()
            })

            bm.hands = null
        })

        while (this.dealer.getChildren().length) {
            this.dealer.getChildren()[0].remove()
        }

        this.model.set('dealer', null)

        self.toggleButtons()

        cb()
    },

    onBetting: function(packet, cb) {
        var self = this

        self.discard(function() {
            self.model.set('state', 'betting')
            self.toggleButtons()
            cb()
        })
    },

    render: function() {
        return this;
    }
})

BjMachineView.model = Models.BjMachine
