var Backbone = require('backbone')
, _ = require('underscore')
, app = require('../app')
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
        , html = '<p>Send bitcoins to <a href="bitcoin:' + address + '?label=play.luckco.in">' +
            address +
            '</a></p>' +
            '<p>Minimum 0.0001 BTC (one credit)</p>'
            '<p>It can take some minutes before you get credited</p>'

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

        alertify.prompt('To which address?', function(e, address) {
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