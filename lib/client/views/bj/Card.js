var spriteMap = JSON.parse('[{"x":250,"y":0,"width":250,"height":363,"filename":"as.png"},{"x":1500,"y":726,"width":250,"height":363,"filename":"2s.png"},{"x":500,"y":0,"width":250,"height":363,"filename":"3s.png"},{"x":0,"y":363,"width":250,"height":363,"filename":"4s.png"},{"x":250,"y":363,"width":250,"height":363,"filename":"5s.png"},{"x":500,"y":363,"width":250,"height":363,"filename":"6s.png"},{"x":750,"y":0,"width":250,"height":363,"filename":"7s.png"},{"x":750,"y":363,"width":250,"height":363,"filename":"8s.png"},{"x":1000,"y":0,"width":250,"height":363,"filename":"9s.png"},{"x":1000,"y":363,"width":250,"height":363,"filename":"ts.png"},{"x":0,"y":726,"width":250,"height":363,"filename":"js.png"},{"x":250,"y":726,"width":250,"height":363,"filename":"qs.png"},{"x":500,"y":726,"width":250,"height":363,"filename":"ks.png"},{"x":750,"y":726,"width":250,"height":363,"filename":"ah.png"},{"x":1000,"y":726,"width":250,"height":363,"filename":"2h.png"},{"x":1250,"y":0,"width":250,"height":363,"filename":"3h.png"},{"x":1250,"y":363,"width":250,"height":363,"filename":"4h.png"},{"x":1250,"y":726,"width":250,"height":363,"filename":"5h.png"},{"x":0,"y":1089,"width":250,"height":363,"filename":"6h.png"},{"x":250,"y":1089,"width":250,"height":363,"filename":"7h.png"},{"x":500,"y":1089,"width":250,"height":363,"filename":"8h.png"},{"x":750,"y":1089,"width":250,"height":363,"filename":"9h.png"},{"x":1000,"y":1089,"width":250,"height":363,"filename":"th.png"},{"x":1250,"y":1089,"width":250,"height":363,"filename":"jh.png"},{"x":1500,"y":0,"width":250,"height":363,"filename":"qh.png"},{"x":1500,"y":363,"width":250,"height":363,"filename":"kh.png"},{"x":0,"y":0,"width":250,"height":363,"filename":"ad.png"},{"x":1500,"y":1089,"width":250,"height":363,"filename":"2d.png"},{"x":1750,"y":0,"width":250,"height":363,"filename":"3d.png"},{"x":1750,"y":363,"width":250,"height":363,"filename":"4d.png"},{"x":1750,"y":726,"width":250,"height":363,"filename":"5d.png"},{"x":1750,"y":1089,"width":250,"height":363,"filename":"6d.png"},{"x":0,"y":1452,"width":250,"height":363,"filename":"7d.png"},{"x":250,"y":1452,"width":250,"height":363,"filename":"8d.png"},{"x":500,"y":1452,"width":250,"height":363,"filename":"9d.png"},{"x":750,"y":1452,"width":250,"height":363,"filename":"td.png"},{"x":1000,"y":1452,"width":250,"height":363,"filename":"jd.png"},{"x":1250,"y":1452,"width":250,"height":363,"filename":"qd.png"},{"x":1500,"y":1452,"width":250,"height":363,"filename":"kd.png"},{"x":1750,"y":1452,"width":250,"height":363,"filename":"ac.png"},{"x":2000,"y":0,"width":250,"height":363,"filename":"2c.png"},{"x":2000,"y":363,"width":250,"height":363,"filename":"3c.png"},{"x":2000,"y":726,"width":250,"height":363,"filename":"4c.png"},{"x":2000,"y":1089,"width":250,"height":363,"filename":"5c.png"},{"x":2000,"y":1452,"width":250,"height":363,"filename":"6c.png"},{"x":0,"y":1815,"width":250,"height":363,"filename":"7c.png"},{"x":250,"y":1815,"width":250,"height":363,"filename":"8c.png"},{"x":500,"y":1815,"width":250,"height":363,"filename":"9c.png"},{"x":750,"y":1815,"width":250,"height":363,"filename":"tc.png"},{"x":1000,"y":1815,"width":250,"height":363,"filename":"jc.png"},{"x":1250,"y":1815,"width":250,"height":363,"filename":"qc.png"},{"x":1500,"y":1815,"width":250,"height":363,"filename":"kc.png"},{"x":1750,"y":1815,"width":250,"height":363,"filename":"back.png"}]')
, bj = require('../../../bj')
, cu = require('../../canvas')
, Card = module.exports = function(assets, card, width) {
    var image = cu.kineticImageFromSpriteMap(
        assets.cards,
        spriteMap,
        bj.pretty(card) + '.png'
    )

    width || (width = 100)
    image.setName(bj.pretty(card))
    image.setWidth(width)
    image.setHeight(width / (250 / 353))

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
            cb && cb()
        }, duration)
    }

    return image
}
