var Backbone = require('backbone')
, _ = require('underscore')
, app = require('../app')
, WelcomeView = require('./WelcomeView')
, MenuView = module.exports = Backbone.View.extend({
    el: '#top-bar',

    events: {
        'click *[data-action="login"]': 'loginClicked',
        'click *[data-action="deposit"]': 'depositClicked',
        'click *[data-action="help"]': 'helpClicked',
        'click *[data-action="withdraw"]': 'withdrawClicked'
    },

    loginClicked: function() {
        window.location = '/authorize/redirect'
    },

    depositClicked: function() {
        var address = app.user.get('address')
        , html = '<p>Send bitcoins to <a href="bitcoin:' + address + '?label=luckco.in">' +
            address +
            '</a></p>' +
            '<p>Minimum 0.001 BTC (one credit). It can take some minutes before you get credited</p>'

        alertify.alert(html)
    },

    helpClicked: function() {
        var html = '<p>If you have any problems, check out the <a href="https://bitcointalk.org/index.php?topic=128969" target="_blank">forum thread</a></p>'

        alertify.alert(html)
    },

    withdrawClicked: function() {
        var self = this

        if (app.user.get('balance') === 0) {
            return alertify.alert('there are no credits to withdraw... you have to gamble to win!')
        }

        var held = Math.max(0, app.user.get('requirement') - app.user.get('wagered'))
        , amount = app.user.get('balance') - held

        if (amount <= 0) {
            return alertify.alert('<p>You cannot withdraw anything because of a ' +
                (held / 1e5) +
                ' credit play requirement on your account from a bonus</p>'
            )
        }

        var holdWarning = ''

        if (held > 0) {
            holdWarning = '<p>Note that this is lower than your balance because of a ' +
                (held / 1e5) +
                ' credit play requirement from a bonus</p>'
        }

        if (app.user.get('balance') < 10 * 1e5) {
            var msg = '<p>Minimum withdraw is 10 credits, sorry!</p>' +
                holdWarning

            return alertify.alert(msg)
        }

        var explanation = '<p>You are withdrawing ' + (amount / 1e5) + ' credits</p>'
            + holdWarning
            + '<p>To which bitcoin address?</p>'

        alertify.prompt(explanation, function(e, address) {
            if (!e) return
            app.socket.emit('withdraw', { address: address })
        })
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