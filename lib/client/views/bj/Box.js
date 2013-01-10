var _ = require('underscore')
, async = require('async')
, Hand = require('./Hand')
, Box = module.exports = function(assets) {
    var group = new Kinetic.Group({
        name: 'box'
    })

    group.splits = 0

    var circle = new Kinetic.Circle({
        x: 0,
        y: 0,
        radius: 60,
        stroke: 'white',
        name: 'bet circle'
    })

    group.add(circle)

    group.bet = new Kinetic.Text({
        text: 'BET 2',
        name: 'bet',
        align: 'center',
        width: 100,
        fontSize: 18,
        textFill: 'white',
        visible: false
    })

    group.bet.setAttrs({
        x: -group.bet.getWidth() / 2,
        y: -group.bet.getHeight() / 2
    })

    group.add(group.bet)

    group.sit = new Kinetic.Text({
        text: 'SIT HERE',
        name: 'sit',
        align: 'center',
        width: 100,
        fontSize: 18,
        textFill: 'white',
        visible: false
    })

    group.sit.setAttrs({
        x: -group.sit.getWidth() / 2,
        y: -group.sit.getHeight() / 2
    })

    group.add(group.sit)
    group.hands = []

    group.setBet = function(value) {
        bet.setVisible(!!value)
        value && bet.setText('BET: ' + value)
        bet.getLayer().draw()
    }

    group.addHand = function() {
        var hand = new Hand(assets)
        hand.index = group.splits
        hand.setId(group.getId() + '-hand-' + group.splits)
        group.add(hand)
        group.hands.push(hand)
        layout()
        return hand
    }

    function layout() {
        var hands = group.get('.hand')

        if (hands.length === 0) return

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
                    x: 60,
                    y: 25
                }, {
                    x: -60,
                    y: 25
                }]
            },
            3: {
                scale: 0.6,
                hands: [{
                    x: 70,
                    y: 25
                }, {
                    x: -5,
                    y: 25
                }, {
                    x: -80,
                    y: 25
                }]
            }
        }

        var setup = layouts[hands.length]

        for (var hi = 0; hi < hands.length; hi++) {
            hands[hi].setAttrs({
                scale: setup.scale,
                x: setup.hands[hi].x + offset.x,
                y: setup.hands[hi].y + offset.y
            })
        }

        group.getLayer().draw()
    }

    group.split = function(shi, cards) {
        group.splits++

        var sourceHand = group.get('.hand')[shi]
        , sourceCard = sourceHand.popCard()
        , destHand = group.addHand()
        destHand.addCard(sourceCard)
        sourceHand.addCard(cards[0])
        destHand.addCard(cards[1])
        layout()
        return destHand
    }

    group.discard = function(cb) {
        async.forEach(_.clone(group.get('.hand')), function(hand, next) {
            hand.discard(next)
        }, function() {
            _.invoke(group.get('.hand'), 'remove')
            group.splits = 0
            group.hands = []
            cb && cb()
        })
    }

    return group
}
