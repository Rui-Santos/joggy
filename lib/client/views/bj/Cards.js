var _ = require('underscore')
, async = require('async')
, Card = require('./Card')
, Cards = module.exports = function(assets, layout) {
    this.cards = []
    this.assets = assets
    this.layout = layout
    this.node = new Kinetic.Group({
        name: 'cards'
    })
}

Cards.prototype.add = function(val) {
    var card = new Card(this.assets, val)
    this.cards.push(card)
    this.node.add(card.node)

    var count = this.cards.length

    if (this.layout) {
        card.node.setX(count * 17)
        card.node.setY(count * -10)
    } else {
        card.node.setX(count * 120)
    }

    this.node.getLayer().draw()

    return card
}

Cards.prototype.discard = function(cb) {
    var self = this

    async.forEach(_.clone(this.cards), function(card, next) {
        card.discard(next)
    }, cb)

    this.cards = []
}

Cards.prototype.popCard = function() {
    var card = this.cards.pop()
    card.node.remove()
    return card.value
}
