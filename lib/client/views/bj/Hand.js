var Cards = require('./Cards')
, _ = require('underscore')
, bj = require('../../../bj')
, async = require('async')
, Hand = module.exports = function(assets) {
    var group = new Kinetic.Group({
        name: 'hand'
    })

    var cards = Cards(assets, 1)
    , values = []

    group.add(cards)

    var summary = new Kinetic.Text({
        textFill: 'white',
        y: -40,
        name: 'summary',
        id: 'summary'
    })

    group.debug = new Kinetic.Text({
        text: '',
        fontSize: 30,
        x: 0,
        textFill: 'white',
        y: 50
    })
    group.add(group.debug)

    group.add(summary)

    var activeArrow = new Kinetic.Text({
        text: $('<div>&darr;</div>').text(),
        fontSize: 30,
        x: 50,
        textFill: 'white',
        y: -80,
        visible: false
    })

    group.add(activeArrow)

    function updateSummary() {
        if (!values.length) {
            summary.setText('')
        } else if (bj.isBust(values)) {
            summary.setText('BUST')
        } else {
            summary.setText(bj.pretty(values))
        }
    }

    group.setActive = function(v) {
        activeArrow.setVisible(v)
        activeArrow.getLayer().draw()
    }

    group.addCard = function(c) {
        values.push(c)

        if (activeArrow.getVisible()) {
            activeArrow.setY(activeArrow.getY() - 25)
            activeArrow.setX(activeArrow.getX() + 25)
        }

        cards.addCard(c)

        updateSummary()

        group.getLayer().draw()
    }

    group.popCard = function() {
        var value = cards.popCard()
        values.pop()
        updateSummary()

        if (activeArrow.getVisible()) {
            activeArrow.setY(activeArrow.getY() + 25)
        }

        group.getLayer().draw()
        return value
    }

    group.discard = function(cb) {
        activeArrow.remove()
        summary.remove()
        cards.discard(cb)
    }

    return group
}
