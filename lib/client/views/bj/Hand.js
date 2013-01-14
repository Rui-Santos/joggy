var Cards = require('./Cards')
, _ = require('underscore')
, bj = require('../../../bj')
, async = require('async')
, HandSummary = require('./HandSummary')
, Countdown = require('./Countdown')
, ChipStack = require('./ChipStack')
, Hand = module.exports = function(assets) {
    this.splits = 0
    this.assets = assets
    this.cards = new Cards(assets, 1)
    this.node = new Kinetic.Group({
        name: 'hand'
    })
    this.node.add(this.cards.node)

    // summary
    this.summary = new HandSummary()
    this.node.add(this.summary.node)

    // chip stack
    this.bet = new ChipStack()
    this.bet.radius = 30
    this.bet.node.setAttrs({
        x: 20,
        y: 150
    })
    this.node.add(this.bet.node)
}

Hand.prototype.setActive = function(v, s) {
    if (v) {
        this.countdown && this.countdown.remove()
        this.countdown = new Countdown(s, 20)
        this.layoutCountdown()

        this.node.add(this.countdown.node)
        this.countdown.start()
    } else {
        this.countdown && this.countdown.remove()
        this.countdown = null
    }
}

Hand.prototype.layoutCountdown = function() {
    var firstCard = _.first(this.cards.cards).node
    , lastCard = _.last(this.cards.cards).node
    , cardWidth = firstCard.getWidth()
    , centerX = (firstCard.getX() + lastCard.getX() + lastCard.getWidth()) / 2

    console.log('centerX', centerX)

    this.countdown.node.setAttrs({
        x: centerX - this.countdown.radius - 12,
        y: lastCard.getY() - (this.countdown.radius + 5) * 2 - 5
    })
}

Hand.prototype.popCard = function() {
    var card = this.cards.popCard()

    this.updateSummary()

    this.countdown && this.layoutCountdown()

    this.node.getLayer().draw()

    return card
}

Hand.prototype.updateSummary = function() {
    var values = _.pluck(this.cards.cards, 'value')
    , lastCard = _.last(this.cards.cards)

    if (!values.length) {
        this.summary.node.setVisible(false)
        return
    }

    this.summary.node.setAttrs({
        visible: true,
        x: lastCard.node.getX() + lastCard.node.getWidth(),
        y: lastCard.node.getY()
    })

    this.summary.update(this.splits, values)

    this.node.getLayer().draw()
}

Hand.prototype.discard = function(cb) {
    this.countdown && this.countdown.remove()
    this.countdown = null

    this.bet.node.remove()
    this.bet = null

    this.summary.node.remove()
    this.summary = null

    this.cards.discard(cb)
    this.cards = null
}

Hand.prototype.add = function(index) {
    this.cards.add(index)

    this.countdown && this.layoutCountdown()
    this.updateSummary()

    this.node.getLayer().draw()
}
