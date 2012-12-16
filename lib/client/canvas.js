var _ = require('underscore')

module.exports = {
    loadAssets: function(assets, cb) {
        var remaining = assets.length,
            result = {}
        _.each(assets, function (v, k) {
            var img = new Image()
            img.onerror = cb
            img.onload = function () {
                --remaining || cb(null, result)
            }
            img.src = v
            result[k] = img
        })
    },

    drawFromSpriteMap: function(img, sm, fn, ctx, dx, dy, dw, dh) {
        var s = _.where(sm, {
            filename: fn
        })[0]
        if (!s) {
            console.log(s, fn);
            throw new Error('no such entry in map ' + fn)
        }
        ctx.drawImage(img, s.x, s.y, s.width, s.height, dx, dy, dw, dh)
    }
}
