var View = require('./View')
, app = require('../app')
, WithdrawView = module.exports = View.extend({
    el: '#withdraw-modal',

    events: {
        'click .withdraw': 'withdraw'
    },

    withdraw: function(e) {
        e.preventDefault()

        var balance = app.user.get('balance')
        , held = Math.min(0, app.user.get('requirement'), app.user.get('wagered'))
        , avail = held > balance ? 0 : balance
        , credits = +this.$el.find('#credits').val()
        , satoshi = credits * 1e5
        , address = $.trim(this.$el.find('#address').val())

        if (credits < 10) {
            this.$el.find('.error').show().html('Cannot withdraw less than ten credits')
            return
        }

        if (satoshi > avail) {
            this.$el.find('.error').show().html('Cannot withdraw more than available')
            return
        }

        app.socket.emit('withdraw', { address: address, satoshi: satoshi })

        alertify.success('Your withdraw is underway!')

        this.$el.modal('hide')
    },

    show: function() {
        var balance = app.user.get('balance')
        , held = Math.min(0, app.user.get('requirement'), app.user.get('wagered'))
        , avail = held > balance ? 0 : balance

        this.$el.find('.balance').html((balance / 1e5) + ' CREDITS')
        this.$el.find('.held').html((held / 1e5) + ' CREDITS')
        this.$el.find('.available').html((avail / 1e5) + ' CREDITS')
        this.$el.find('#credits').val('')
        this.$el.find('#address').val('')
        this.$el.find('.error').hide()

        var self = this

        setTimeout(function() {
            self.$el.find('#credits').focus()
        }, 500)

        this.$el.modal()
    }
})