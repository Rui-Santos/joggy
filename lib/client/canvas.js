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

    pointInRect: function(x, y, rx, ry, rw, rh) {
        return x >= rx && y >= ry && x <= rx + rw && y <= ry + rh
    },

    pointInShape: function(x, y, s) {
        return pointInRect(x, y, s.x, s.y, s.w, s.h)
    },

    mousePos: function(canvas, sw, sh, e) {
        var offset = $(canvas).offset(),
        x = e.pageX - offset.left,
        y = e.pageY - offset.top

        return {
            x: x / (canvas.width / sw),
            y: y / (canvas.height / sh)
        }
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
