var Backbone = require('backbone')
, _ = require('underscore')
, MenuView = module.exports = Backbone.View.extend({
    el: '#menu',

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
        var address = this.options.app.user.get('address')
        , html = '<p>Send BTC to <a href="bitcoin:' + address + '?label=play.luckco.in">' + address + '</a></p><p>It can take a few minutes before you get credited</p><p>1 BTC = 1000 credits</p>'

        alertify.alert(html)
    },

    helpClicked: function() {
        var html = '<p>If you have any problems, check out the <a href="https://bitcointalk.org/index.php?topic=128969" target="_blank">forum thread</a></p>'

        alertify.alert(html)
    },

    withdrawClicked: function() {
        var self = this

        if (self.options.app.user.get('balance') === 0) {
            return alertify.alert('there are no credits to withdraw... you have to gamble to win!')
        }

        alertify.prompt('To which address?', function(e, address) {
            if (!e) return
            self.options.app.socket.emit('withdraw', { address: address })
        })
    },

    render: function() {
        console.log('rendering menu')

        var $loggedIn = this.$el.find('.logged-in');
        var $notLoggedIn = this.$el.find('.not-logged-in');

        $loggedIn.toggle(!!this.options.app.user);
        $notLoggedIn.toggle(!this.options.app.user);

        if (this.options.app.user) {
            console.log('user for menu', this.options.app.user)
            $loggedIn.find('.deposit-address').html(this.options.app.user.get('address'))
        }

        return this;
    }
})