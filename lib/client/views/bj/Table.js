var Box = require('./Box')
, async = require('async')
, Cards = require('./Cards')
, Table = module.exports = function(assets, container) {
    var table = new Kinetic.Stage({
        container: container,
        width: 1000,
        height: 800
    })
    , layer = table.layer = new Kinetic.Layer()

    table.add(layer)

    // background
    layer.add(new Kinetic.Rect({
        id: 'background',
        width: table.getWidth(),
        height: table.getHeight(),
        fill: '#009900'
    }))

    var spacer = 195
    , offset = { x: 105, y: 490 }
    , boxGrid = [
        { x: offset.x + spacer * 4, y: offset.y },
        { x: offset.x + spacer * 3, y: offset.y + 100 },
        { x: offset.x + spacer * 2, y: offset.y + 150 },
        { x: offset.x + spacer * 1, y: offset.y + 100 },
        { x: offset.x + spacer * 0, y: offset.y }
    ]

    table.boxes = _.map(_.range(5), function(bi) {
        var box = Box(assets)
        box.index = bi
        box.setId('box-' + bi)

        box.bet.on('click', function() {
            table.simulate('bet', { box: bi })
        })

        box.sit.on('click', function() {
            table.simulate('sit', { box: bi })
        })

        box.setX(boxGrid[bi].x)
        box.setY(boxGrid[bi].y)

        layer.add(box)
        return box
    })

    table.dealer = null

    function createButton(attrs) {
        return new Kinetic.Text(_.extend({
            padding: 20,
            textFill: 'white',
            width: 120,
            align: 'center',
            stroke: 'white',
            fill: '#007700',
            fontSize: 20,
            y: 722
        }, attrs))
    }

    var buttonOffset = 380

    table.hit = createButton({
        id: 'hit',
        text: 'HIT',
        x: buttonOffset,
        name: 'hit'
    })

    table.hit.on('click', function() {
        table.simulate('hit')
    })

    buttonOffset += 120

    layer.add(table.hit)

    table.stand = createButton({
        id: 'stand',
        text: 'STAND',
        x: buttonOffset,
        name: 'stand'
    })

    table.stand.on('click', function() {
        table.simulate('stand')
    })

    buttonOffset += 120

    layer.add(table.stand)

    table.double = createButton({
        id: 'double',
        text: 'DOUBLE',
        x: buttonOffset,
        name: 'double'
    })

    table.double.on('click', function() {
        table.simulate('double')
    })

    buttonOffset += 120

    layer.add(table.double)

    table.split = createButton({
        id: 'split',
        text: 'SPLIT',
        x: buttonOffset,
        name: 'split'
    })

    table.split.on('click', function() {
        table.simulate('split')
    })

    layer.add(table.split)

    table.resetDealer = function(value) {
        table.dealer && table.dealer.remove()
        table.dealer = Cards(assets, 0)
        table.dealer.setAttrs({
            x: 300,
            y: 25,
            name: 'dealer',
            id: 'dealer'
        })
        layer.add(table.dealer)
        table.dealer.addCard(value)
    }

    table.discard = function(cb) {
        async.parallel({
            dealer: function(next) {
                table.dealer ? table.dealer.discard(next) : next()
            },

            boxes: function(next) {
                async.forEach(table.boxes, function(box) {
                    box.discard(next)
                }, next)
            }
        }, function() {
            table.dealer && table.dealer.remove()
            table.dealer = null
            cb()
        })
    }

    layer.draw()

    return table
}
