var outer = $('body')
, Card = require('../lib/client/views/bj/Card')
, Box = require('../lib/client/views/bj/Box')
, Hand = require('../lib/client/views/bj/Hand')
, Cards = require('../lib/client/views/bj/Cards')
, cu = require('../lib/client/canvas')
, assets

function createTestArea(n, w, h) {
    console.log(n)
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
        var s = createTestArea('box - split discard')
        , box = Box(assets)
        s.layer.add(box)
        box.setY(100)
        box.setX(150)
        box.setBet(25)

        var hand = box.addHand()
        hand.addCard(24)
        hand.addCard(25)

        var hand2 = box.split(0)
        hand.addCard(26)
        hand2.addCard(27)

        var hand3 = box.split(0)
        hand.addCard(26)
        hand3.addCard(27)

        s.draw()

        setTimeout(function() {
            box.discard()
        }, 1000)
    })();

    (function() {
        var s = createTestArea('box - splits')
        , box = Box(assets)
        s.layer.add(box)
        box.setY(100)
        box.setX(150)
        box.setBet(25)

        var hand = box.addHand()
        hand.addCard(24)
        hand.addCard(25)

        var hand2 = box.split(0)
        hand.addCard(26)
        hand2.addCard(27)

        var hand3 = box.split(0)
        hand.addCard(26)
        hand3.addCard(27)

        s.draw()
    })();

    (function() {
        var s = createTestArea('box - split')
        , box = Box(assets)
        s.layer.add(box)
        box.setY(100)
        box.setX(150)
        box.setBet(25)

        var hand = box.addHand()
        hand.addCard(24)
        hand.addCard(25)

        var hand2 = box.split(0)
        hand.addCard(26)
        hand2.addCard(27)

        s.draw()
    })();

    (function() {
        var s = createTestArea('box - hand')
        , box = Box(assets)
        s.layer.add(box)
        box.setY(100)
        box.setX(150)
        box.setBet(25)

        var hand = box.addHand()
        hand.addCard(25)
        hand.toggleAction('hit', true)

        s.draw()
    })();

    (function() {
        var s = createTestArea('box - bet')
        , box = Box(assets)
        s.layer.add(box)
        box.setY(100)
        box.setX(150)

        var bet = 0

        setInterval(function() {
            box.setBet((bet++) % 20)
        }, 500)

        s.draw()
    })();

    (function() {
        var s = createTestArea('hand - actions')
        , hand = Hand(assets)
        s.layer.add(hand)
        hand.setY(100)
        hand.setX(150)

        hand.addCard(2)
        hand.addCard(3)
        var values = []

        hand.toggleAction('hit', true)
        hand.toggleAction('stand', true)

        hand.hit.on('click', function() {
            var c = Math.floor(Math.random() * 52) + 1
            hand.addCard(c)
            values.push(c)

            if (c > 21) {
                setTimeout(function() {
                    hand.discard()
                }, 1500)
            }
        })

        hand.stand.on('click', function() {
            hand.toggleAction('hit', false)
            hand.toggleAction('stand', false)
        })

        s.draw()
    })();

    (function() {
        var s = createTestArea('hand - discard')
        , hand = Hand(assets)
        s.layer.add(hand)
        hand.setY(100)
        hand.setX(150)

        hand.addCard(1)
        hand.addCard(2)
        hand.addCard(3)

        hand.discard(function() {
            console.log('hand discarded')
        })

        s.draw()
    })();

    (function() {
        var s = createTestArea('card - display')
        , card = Card(assets, 1)
        s.layer.add(card)
        s.draw()
    })();

    (function() {
        var s = createTestArea('card - discard')
        , card = Card(assets, 1, 75)
        s.layer.add(card)
        card.setY(100)
        card.setX(150)
        card.discard(function() {
            console.log('discarded')
        })
        s.draw()
    })();

    (function() {
        var s = createTestArea('cards - layout 0')
        , cards = Cards(assets)
        s.layer.add(cards)

        cards.addCard(1)
        cards.addCard(2)
        cards.addCard(3)

        s.draw()
    })();

    (function() {
        var s = createTestArea('cards - layout 1')
        , cards = Cards(assets, 1)
        s.layer.add(cards)
        cards.setY(100)

        cards.addCard(1)
        cards.addCard(2)
        cards.addCard(3)

        s.draw()
    })();

    (function() {
        var s = createTestArea('hand - add three')
        , hand = Hand(assets)
        s.layer.add(hand)
        hand.setY(100)

        hand.addCard(1)
        hand.addCard(2)
        hand.addCard(3)

        s.draw()
    })();
}

cu.loadAssets({
    cards: '/media/cards.png'
}, function(err, a) {
    assets = a
    tests()
})
