var Cards = require('./Cards')
, _ = require('underscore')
, bj = require('../../../bj')
, async = require('async')
, HandSummary = require('./HandSummary')

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

    // active arrow
    this.activeArrow = new Kinetic.Text({
        text: $('<div>&darr;</div>').text(),
        fontSize: 30,
        x: 50,
        textFill: 'white',
        y: -80,
        visible: false
    })
    this.node.add(this.activeArrow)

    // chip stack
    this.bet = new ChipStack()
    this.bet.radius = 30
    this.bet.node.setAttrs({
        x: 20,
        y: 150
    })
    this.node.add(this.bet.node)
}

Hand.prototype.setActive = function(v) {
    this.activeArrow.setVisible(v)
    this.activeArrow.getLayer().draw()
}

Hand.prototype.popCard = function() {
    var card = this.cards.popCard()

    this.updateSummary()

    console.log('popped ', card)

    if (this.activeArrow.getVisible()) {
        this.activeArrow.setY(this.activeArrow.getY() + 25)
    }

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
    this.activeArrow.remove()
    this.activeArrow = null

    this.bet.node.remove()
    this.bet = null

    this.summary.node.remove()
    this.summary = null

    this.cards.discard(cb)
    this.cards = null
}

Hand.prototype.add = function(index) {
    this.cards.add(index)

    if (this.activeArrow.getVisible()) {
        this.activeArrow.setY(this.activeArrow.getY() - 25)
        this.activeArrow.setX(this.activeArrow.getX() + 25)
    }

    this.updateSummary()

    this.node.getLayer().draw()
}
