var Cards = require('./Cards')
, HandSummary = require('./HandSummary')
, util = require('util')
, _ = require('underscore')
, Dealer = module.exports = function() {
    Dealer.super_.apply(this, arguments)

    this.summary = new HandSummary()
    this.node.add(this.summary.node)
}

util.inherits(Dealer, Cards)

Dealer.prototype.add = function(index) {
    var result = Cards.prototype.add.call(this, index)

    this.summary.update(0, _.pluck(this.cards, 'value'))

    var last = _.last(this.cards)
    this.summary.node.setX(last.node.getX() + last.node.getWidth())
    this.summary.node.getLayer().draw()

    return result
}

Dealer.prototype.discard = function() {
    var layer = this.summary.node.getLayer()
    this.summary.node.remove()
    this.summary = null
    layer.draw()
    Cards.prototype.discard.apply(this, arguments)
}
