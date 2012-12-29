var Backbone = require('backbone')
, _ = require('underscore')
, app = require('../app')
, WelcomeView = require('./WelcomeView')
, WithdrawView = require('./WithdrawView')
, MenuView = module.exports = Backbone.View.extend({
    el: '#top-bar',

    events: {
        'click *[data-action="login"]': 'loginClicked',
        'click *[data-action="deposit"]': 'depositClicked',
        'click *[data-action="withdraw"]': 'withdrawClicked'
    },

    loginClicked: function(e) {
        e.preventDefault()
        app.router.redirectToLogin()
    },

    depositClicked: function(e) {
        e.preventDefault()

        var address = app.user.get('address')
        , html = '<p>Send bitcoins to <a href="bitcoin:' + address + '?label=luckco.in">' +
            address +
            '</a></p>' +
            '<p>Instant deposits! Minimum 0.001 BTC (one credit)</p>'

        alertify.alert(html)
    },

    withdrawClicked: function(e) {
        var self = this

        e.preventDefault()

        if (!app.views.withdraw) {
            app.views.withdraw = new WithdrawView()
        }

        app.views.withdraw.show()
    },

    render: function() {
        console.log('rendering menu')

        var loggedIn = !!app.user

        this.$el.find('*[data-action="login"]').toggle(!loggedIn)
        this.$el.find('*[data-action="withdraw"]').toggle(loggedIn)
        this.$el.find('*[data-action="deposit"]').toggle(loggedIn)

        return this
    }
})