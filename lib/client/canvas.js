var _ = require('underscore')

module.exports = {
    loadAssets: function(assets, cb) {
        var remaining = _.keys(assets).length,
            result = {}
        _.each(assets, function (v, k) {
            console.log('loading ' + assets.length + ' assets')
            var img = new Image()
            img.onerror = cb
            img.onload = function () {
                console.log((remaining - 1) + ' assets remaining to load');
                --remaining || cb(null, result)
            }
            img.src = v
            result[k] = img
        })
    },

    // disables dragging, text selection
    prepareCanvas: function(canvas) {
        var $canvas = $(canvas)

        $canvas
            .attr('unselectable', 'on')
            .css('user-select', 'none')
            .on('selectstart', false)
            .css('pointer', 'default')
            .css('-moz-user-select', 'none')
            .css('-khtml-user-select', 'none')
            .css('-webkit-tap-highlight-color', 'transparent')

        canvas.draggable = false
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
    },

    kineticImageFromSpriteMap: function(img, sm, fn) {
        var s = _.where(sm, { filename: fn })[0]
        if (!s) throw new Error(fn + ' not found')

        return new Kinetic.Image({
            image: img,
            width: s.width,
            height: s.height,
            crop: s
        })
    }
}
