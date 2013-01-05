var Cards = require('./Cards')
, _ = require('underscore')
, bj = require('../../../bj')
, async = require('async')
, Hand = module.exports = function(assets) {
    var group = new Kinetic.Group({
    })

    var cards = Cards(assets, 1)
    , values = []

    group.add(cards)

    var summary = new Kinetic.Text({
        textFill: 'white',
        y: -40
    })

    group.add(summary)

    function updateSummary() {
        if (!values.length) {
            summary.setText('')
        } else if (bj.isBust(values)) {
            summary.setText('BUST')
        } else {
            summary.setText(bj.pretty(values))
        }
    }

    group.addCard = function(c) {
        values.push(c)
        cards.addCard(c)
        updateSummary()
    }

    group.discard = function(cb) {
        summary.remove()

        async.forEach(_.clone(cards.getChildren()), function(card, next) {
            console.log('discard (part of hand)', card)
            card.discard(next)
        }, function() {
            cards.removeChildren()
            cb && cb()
        })
    }

    return group
}
