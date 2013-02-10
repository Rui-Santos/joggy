var _ = require('underscore')
, SetupView = require('./SetupView')
, SpotView = module.exports = function() {
    this.$el = $('<div>').addClass('spot')
    this.$user = $('<div></div>').addClass('user').appendTo(this.$el)

    this.sv = new SetupView()
    this.$el.append(this.sv.$el)
}

SpotView.prototype.user = function(v) {
    if (!_.isUndefined(v)) {
        this.user = v
        this.$user.html(v)
    }

    return this.user || null
}