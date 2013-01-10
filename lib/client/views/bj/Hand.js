var Cards = require('./Cards')
, _ = require('underscore')
, bj = require('../../../bj')
, async = require('async')

, ChipStack = require('./ChipStack')
, Hand = module.exports = function(assets) {
    this.assets = assets
    this.cards = new Cards(assets, 1)
    this.node = new Kinetic.Group({
        name: 'hand'
    })
    this.node.add(this.cards.node)

    // summary
    this.summary = new Kinetic.Text({
        textFill: 'white',
        y: -40,
        name: 'summary',
        id: 'summary'
    })

    this.node.add(this.summary)

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

    if (!this.cards.length) {
        this.summary.setText('')
    } else if (bj.isBust(values)) {
        this.summary.setText('BUST')
    } else {
        this.summary.setText(bj.pretty(values))
    }
}

Hand.prototype.discard = function(cb) {
    this.activeArrow.remove()
    this.bet.node.remove()
    this.summary.remove()
    this.cards.discard(cb)
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
