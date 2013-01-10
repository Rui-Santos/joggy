var spriteMap = require('../../../../assets/card-sprites.json')
, bj = require('../../../bj')
, cu = require('../../canvas')
, Card = module.exports = function(assets, value, width) {
    var image = cu.kineticImageFromSpriteMap(
        assets.cards,
        spriteMap,
        bj.pretty(value) + '.png'
    )

    width || (width = 110)
    image.setName(bj.pretty(value))
    image.setWidth(width)
    image.setHeight(width / (250 / 353))
    image.value = value

    image.discard = function(cb) {
        var pos = image.getAbsolutePosition()
        , duration = 500
        , height = image.getHeight()
        , width = image.getWidth()

        image.moveTo(image.getLayer())
        image.setAbsolutePosition(pos)

        image.transitionTo({
            x: -width * 1.1,
            y: -height * 1.1,
            duration: duration / 1000
        })

        setTimeout(function() {
            image.remove()
            cb && cb()
        }, duration)
    }

    return image
}
