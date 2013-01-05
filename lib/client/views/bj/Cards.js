var Card = require('./Card')
, Cards = module.exports = function(assets, layout) {
    var group = new Kinetic.Group({
        name: 'cards'
    })

    group.addCard = function(val) {
        var card = Card(assets, val)
        , count = group.getChildren().length

        if (layout) {
            card.setX(count * 20)
            card.setY(count * -20)
        } else {
            card.setX(count * 120)
        }

        group.add(card)

        return card
    }

    return group
}
