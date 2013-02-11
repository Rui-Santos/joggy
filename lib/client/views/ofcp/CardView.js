var debug = require('debug')('joggy:ofcp:CardView')
, _ = require('underscore')
, CardView = module.exports = function(assets, index) {
    this.index = index

    var scale = 1
    , layout = {
        offset: { x: -10, y: -10 },
        spacer: { w: 8, h: 8 },
        cardSize: { w: 42, h: 62 },
        sheetSize: { w: 810, h: 290 }
    }

    this.$el = $('<div>').css({
        width: layout.cardSize.w * scale,
        height: layout.cardSize.h * scale,
        overflow: 'hidden',
        position: 'relative'
    }).addClass('card')

    var row = Math.floor((index - 1) / 13)
    , column = Math.floor((index - 1) % 13)

    var css = {
        position: 'absolute',
        width: layout.sheetSize.w * scale,
        height: layout.sheetSize.h * scale,
        top: scale * (layout.offset.y - (layout.cardSize.h + layout.spacer.h) * row),
        left: scale * (layout.offset.x - (layout.cardSize.w + layout.spacer.w) * column),
        'pointer-events': 'none'
    }

    console.log(assets.cards)

    this.$img = $(assets.cards).clone().attr({
    }).css(css).appendTo(this.$el)
}

CardView.prototype.placed = function(v) {
    if (!_.isUndefined(v)) {
        this._placed = v
    }
    return this._placed
}

CardView.prototype.locked = function(v) {
    if (!_.isUndefined(v)) {
        this._locked = v
    }
    return this._locked
}

CardView.prototype.selected = function(v) {
    if (!_.isUndefined(v)) {
        this._selected = v
        this.$el.toggleClass('selected', v)
    }
    return this._selected
}
