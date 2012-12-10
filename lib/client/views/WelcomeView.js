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

    events: {
        'click .games > li > a': 'clickGame'
    },

    clickGame: function(e) {
        e.preventDefault()
        var target = $(e.target)
        , game = target.attr('data-game')

        if (!app.user) {
            return window.location = '/authorize/redirect'
        }

        app.socket.emit('join', { game: game })
    },

    ratio: 1 / 1,

    className: 'welcome',

    template: _.template('<ul class="games"><li><a href="#" data-game="job">Video Poker: Jacks or Better</a></li><li><a href="#" data-game="rwb">Slot: Red, White &amp; Blue</a></li></ul>'),

    render: function() {
        this.$el.html(this.template())
        return this
    }
})