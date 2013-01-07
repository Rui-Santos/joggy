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

    var actionsGroup = new Kinetic.Group({
        name: 'actions'
    })
    , actions = {}
    , actionsOffset = 0

    _.each(['hit', 'stand', 'double', 'split'], function(name) {
        var text = new Kinetic.Text({
            text: name,
            name: name,
            padding: 5,
            x: actionsOffset,
            y: 150,
            textFill: 'white',
            stroke: 'white',
            visible: false,
            fontSize: 10
        })

        actionsOffset += text.textWidth + 14
        actionsGroup.add(text)

        group[name] = text
        actions[name] = text
    })

    group.add(actionsGroup)

    group.toggleAction = function(name, value) {
        console.log(actions[name], name, value)
        actions[name].setVisible(value)
        actions[name].getLayer().draw()
        return this
    }

    group.addCard = function(c) {
        values.push(c)
        cards.addCard(c)
        updateSummary()
        group.getStage().draw()
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
