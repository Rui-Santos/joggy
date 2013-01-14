var spriteMap = require('../../../../assets/card-sprites.json')
, bj = require('../../../bj')
, cu = require('../../canvas')
, Card = module.exports = function(assets, value, width) {
    var self = this

    this.value = value

    this.node = cu.kineticImageFromSpriteMap(
        assets.cards,
        spriteMap,
        bj.pretty(value) + '.png'
    )

    width || (width = 110)

    this.node.setAttrs({
        width: width,
        name: bj.pretty(value),
        height: width / (250 / 353)
    })
}

Card.prototype.discard = function(cb) {
    var self = this
    , pos = this.node.getAbsolutePosition()
    , duration = 200
    , height = this.node.getHeight()
    , width = this.node.getWidth()

    this.node.moveTo(this.node.getLayer())
    this.node.setAbsolutePosition(pos)

    this.node.transitionTo({
        x: -width * 1.1,
        y: -height * 1.1,
        duration: duration / 1000
    })

    setTimeout(function() {
        self.node.remove()
        cb && cb()
    }, duration)
}
