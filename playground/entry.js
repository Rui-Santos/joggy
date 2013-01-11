var outer = $('body')
, _ = require('underscore')
, Card = require('../lib/client/views/bj/Card')
, Box = require('../lib/client/views/bj/Box')
, Hand = require('../lib/client/views/bj/Hand')
, Cards = require('../lib/client/views/bj/Cards')
, ChipStack = require('../lib/client/views/bj/ChipStack')
, Table = require('../lib/client/views/bj/Table')
, bj = require('../lib/bj')
, async = require('async')
, cu = require('../lib/client/canvas')
, assets

function createTestArea(n, w, h) {
    var $container = $('<div style="float:left;border:solid 1px black;"><h1>' + n + '</h1>').appendTo('body')
    var $stageContainer = $('<div>').appendTo($container)
    , stage = new Kinetic.Stage({
        width: w || 500,
        height: h || 300,
        container: $stageContainer[0]
    })
    , layer = new Kinetic.Layer()
    stage.add(layer)
    stage.layer = layer

    return stage
}

function tests() {
    (function() {
        var n = 'table - very full'
        , $container = $('<div style="float:left;border:solid 1px black;"><h1>' + n + '</h1>').appendTo('body')
        , $stageContainer = $('<div>').appendTo($container)
        , table = new Table(assets, $stageContainer[0])

        var i = 1, card = function() {
            return (i++ - 1) % 52 + 1
        }

        async.series([
            function(next) {
                table.deal({
                    dealer: [card()],
                    boxes: [{
                        index: 0,
                        cards: [card(), card()]
                    }, {
                        index: 1,
                        cards: [card(), card()]
                    }, {
                        index: 2,
                        cards: [card(), card()]
                    }, {
                        index: 3,
                        cards: [card(), card()]
                    }, {
                        index: 4,
                        cards: [card(), card()]
                    }]
                }, next)
            },
            function(next) {
                _.each(table.boxes, function(box) {
                    box.split(0, [card(), card()])
                    box.split(0, [card(), card()])
                    box.hands[0].add(card())
                    box.hands[0].add(card())
                    box.hands[0].add(card())

                    box.hands[1].add(card())
                    box.hands[1].add(card())
                    box.hands[1].add(card())

                    box.hands[2].add(card())
                    box.hands[2].add(card())
                    box.hands[2].add(card())
                })

                next()
            }
        ])

        table.layer.draw()
    })();

    (function() {
        var s = createTestArea('card - display')
        , card = new Card(assets, 1)
        s.layer.add(card.node)
        s.draw()
    })();

    (function() {
        var s = createTestArea('card - discard')
        , card = new Card(assets, 1, 75)
        s.layer.add(card.node)
        card.node.setY(100)
        card.node.setX(150)
        card.discard(function() {
            console.log('discarded')
        })
        s.draw()
    })();

    (function() {
        var s = createTestArea('cards - layout 0')
        , cards = new Cards(assets)
        s.layer.add(cards.node)

        cards.add(1)
        cards.add(2)
        cards.add(3)

        s.draw()
    })();

    (function() {
        var s = createTestArea('cards - layout 1')
        , cards = new Cards(assets, 1)
        s.layer.add(cards.node)
        cards.node.setY(100)

        cards.add(1)
        cards.add(2)
        cards.add(3)

        s.draw()
    })();

    (function() {
        var s = createTestArea('chipstack - counter')
        , stack = new ChipStack()
        stack.node.setY(100)
        stack.chips = 1
        s.layer.add(stack.node)

        var interval = setInterval(function() {
            stack.chips += stack.chips
            s.layer.draw()

            if (stack.chips > 5000) clearInterval(interval)
        }, 500)
    })();

    (function() {
        var s = createTestArea('hand - add three')
        , hand = new Hand(assets)
        s.layer.add(hand.node)
        hand.node.setY(100)

        hand.add(1)
        hand.add(2)
        hand.add(3)

        s.draw()
    })();

    (function() {
        var s = createTestArea('box - bet')
        , box = new Box(assets)
        s.layer.add(box.node)
        box.node.setY(220)
        box.node.setX(150)

        var bet = 0

        setInterval(function() {
            box.bet.chips = ((bet++) % 20)
        }, 500)

        s.draw()
    })();


    (function() {
        var s = createTestArea('box - split discard')
        , box = new Box(assets)
        s.layer.add(box.node)
        box.node.setY(220)
        box.node.setX(150)
        box.bet.chips = 25

        var hand = box.deal([24, 25])
        , hand2 = box.split(0, [26, 27])
        , hand3 = box.split(0, [26, 27])

        s.draw()

        setTimeout(function() {
            box.discard()
        }, 1000)
    })();

    (function() {
        var s = createTestArea('box - splits')
        , box = new Box(assets)
        s.layer.add(box.node)
        box.node.setY(220)
        box.node.setX(150)
        box.bet.chips = 25

        box.deal([1, 1])

        var hand2 = box.split(0, [9, 8])
        var hand3 = box.split(0, [26, 27])

        s.draw()
    })();

    (function() {
        var s = createTestArea('box - split')
        , box = new Box(assets)
        s.layer.add(box.node)
        box.node.setY(220)
        box.node.setX(150)
        box.bet.chips = 25

        box.deal([24, 25])

        var hand2 = box.split(0, [26, 27])

        s.draw()
    })();

    (function() {
        var s = createTestArea('box - deal')
        , box = new Box(assets)
        s.layer.add(box.node)
        box.node.setY(200)
        box.node.setX(150)
        box.bet.chips = 25

        box.deal([40, 35])

        s.draw()
    })();

    (function() {
        var s = createTestArea('hand - discard')
        , hand = new Hand(assets)
        s.layer.add(hand.node)
        hand.node.setY(100)
        hand.node.setX(150)

        hand.add(1)
        hand.add(2)
        hand.add(3)

        hand.discard(function() {
            console.log('hand discarded')
        })

        s.draw()
    })();

    (function() {
        var n = 'table - pre-deal'
        , $container = $('<div style="float:left;border:solid 1px black;"><h1>' + n + '</h1>').appendTo('body')
        , $stageContainer = $('<div>').appendTo($container)
        , table = new Table(assets, $stageContainer[0])
    })();
}

cu.loadAssets({
    cards: '/media/cards.png'
}, function(err, a) {
    assets = a
    tests()
})
