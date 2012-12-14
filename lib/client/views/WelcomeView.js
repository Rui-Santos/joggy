var Backbone = require('backbone')
, _ = require('underscore')
, app = require('../app')
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
    },

    ratio: 1 / 1,

    className: 'welcome',

    template: _.template('<ul class="games"><li><a href="#jacks-or-better">Video Poker: Jacks or Better</a></li><li><a href="#red-white-and-blue">Slot: Red, White &amp; Blue</a></li></ul>'),

    render: function() {
        this.$el.html(this.template())
        return this
    }
})