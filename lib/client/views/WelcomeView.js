var Backbone = require('backbone')
, _ = require('underscore')
, WelcomeView = module.exports = Backbone.View.extend({
    initialize: function() {
    },

    rect: function(x, y, width, height) {
        this.$el.css({
            left: x,
            top: y,
            width: width,
            height: height
        })
        console.log(width, height)
    },

    className: 'welcome',

    template: _.template('<div class="message"><h1>Welcome!</h1><p><a href="/authorize/redirect">Click here to play</a></p></div>'),

    render: function() {
        this.$el.html(this.template())
        return this
    }
})