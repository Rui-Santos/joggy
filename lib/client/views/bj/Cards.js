var _ = require('underscore')
, async = require('async')
, Card = require('./Card')
, Cards = module.exports = function(assets, layout) {
    var group = new Kinetic.Group({
        name: 'cards'
    })

    group.addCard = function(val) {
        var card = Card(assets, val)
        , count = group.getChildren().length

        if (layout) {
            card.setX(count * 20)
            card.setY(count * -25)
        } else {
            card.setX(count * 120)
        }

        group.add(card)
        group.getLayer().draw()

        return card
    }

    group.discard = function(cb) {
        var self = this
        async.forEach(_.clone(self.getChildren()), function(card, next) {
            card.discard(next)
        }, function() {
            self.removeChildren()
            cb && cb()
        })
    }

    group.popCard = function() {
        var card = _.last(group.getChildren())
        if (!card) throw new Error('no card to pop')
        card.remove()
        return card.value
    }

    return group
}
