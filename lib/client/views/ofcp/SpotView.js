var _ = require('underscore')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, SetupView = require('./SetupView')
, SpotView = module.exports = function(index, assets) {
    var that = this
    this.index = index
    this.$el = $('<div>').addClass('spot')
    this.$user = $('<div></div>').addClass('user').appendTo(this.$el)

    this.sv = new SetupView(assets)
    this.sv.on('done', function(e) {
        that.emit('done', _.extend(e, { spot: index }))
    })

    this.$el.append(this.sv.$el)
}

util.inherits(SpotView, EventEmitter)

SpotView.prototype.user = function(v) {
    if (!_.isUndefined(v)) {
        this.user = v
        this.$user.html(v)
    }

    return this.user || null
}

SpotView.prototype.done = function(cards) {
    this.sv.done(cards)
}

SpotView.prototype.deal = function(cards) {
    this.sv.deal(cards)
}
