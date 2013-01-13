var _ = require('underscore')
, async = require('async')
, Hand = require('./Hand')
, ChipStack = require('./ChipStack')
, Box = module.exports = function(assets) {
    this.assets = assets
    this.node = new Kinetic.Group({
        name: 'box'
    })

    this.hands = []

    // circle
    this.circle = this.createCircle()
    this.node.add(this.circle)

    // label
    this.label = new Kinetic.Text({
        text: 'SIT HERE',
        name: 'label',
        align: 'center',
        width: 70,
        fontSize: 18,
        textFill: 'white',
        visible: false
    })

    this.label.setAttrs({
        x: -this.label.getWidth() / 2,
        y: -this.label.getHeight() / 2
    })

    this.node.add(this.label)

    // chip stack
    this.bet = new ChipStack()
    this.bet.radius = 30
    this.bet.node.setAttrs({
        x: -30,
        y: -20
    })
    this.node.add(this.bet.node)

    this.user = null
}

Box.prototype.setUser = function(value) {
    this.user = value
    this.label.setText(value || 'SIT HERE')
}

Box.prototype.addHand = function() {
    if (_.isUndefined(this.splits)) throw new Error('not dealt')

    var hand = new Hand(this.assets)
    this.hands.push(hand)

    this.node.add(hand.node)
    this.layout()

    return hand
}

Box.prototype.layout = function() {
    if (!this.hands.length) return

    var offset = { x: -60, y: -175 }

    var layouts = {
        1: {
            scale: 1,
            hands: [{
                x: 0,
                y: 0
            }]
        },
        2: {
            scale: 0.8,
            hands: [{
                x: 100,
                y: 65
            }, {
                x: -65,
                y: 65
            }]
        },
        3: {
            scale: 0.6,
            hands: [{
                x: 105,
                y: 95
            }, {
                x: 15,
                y: 95
            }, {
                x: -70,
                y: 95
            }]
        }
    }

    var setup = layouts[this.splits + 1]

    if (!setup) throw new Error('there is no layout for ' + this.splits + ' splits')

    for (var hi = 0; hi < this.hands.length; hi++) {
        if (!this.hands[hi]) continue
        if (!setup.hands[hi]) throw new Error('the ' + this.splits + ' split setup has definition for hand index ' + hi)

        this.hands[hi].node.setAttrs({
            scale: setup.scale,
            x: setup.hands[hi].x + offset.x,
            y: setup.hands[hi].y + offset.y
        })
    }

    this.node.getLayer().draw()
}

Box.prototype.deal = function(cards, cb) {
    this.splits = 0

    // previously discarded hands may have been set to null
    this.hands = []

    var hand = this.addHand()
    cards && hand.add(cards[0])
    cards && hand.add(cards[1])

    hand.bet.chips = this.bet.chips
    this.bet.chips = 0
    this.layout()

    cb && cb()
}

Box.prototype.split = function(shi, cards, cb) {
    var self = this
    this.splits++

    console.log(this.hands)

    var sourceHand = this.hands[shi]
    , sourceCard = sourceHand.popCard()
    , destHand = this.addHand()

    destHand.add(sourceCard)
    sourceHand.add(cards[0])
    destHand.add(cards[1])
    destHand.bet.chips = sourceHand.bet.chips

    // slightly overkill
    _.each(this.hands, function(hand) {
        if (!hand) return
        hand.splits = self.splits
    })

    this.layout()
    cb && cb()
}

Box.prototype.discard = function(cb) {
    var self = this

    var hands = this.hands
    this.hands = null

    async.forEach(hands, function(hand, next) {
        hand.discard(next)
    }, function() {
        self.splits = null
        self.hands = []
        cb && cb()
    })
}

Box.prototype.createCircle = function() {
    return new Kinetic.Circle({
        x: 0,
        y: 0,
        radius: 50,
        stroke: 'white',
        name: 'bet circle'
    })
}
