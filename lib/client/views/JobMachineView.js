var Backbone = require('backbone')
, crypto = require('crypto')
, shuffle = require('../shuffle')
, job = require('../vp-job')
, Models = require('../../models')
, app = require('../app')
, PaytableView = require('./PaytableView')
, MachineView = require('./MachineView')
, JobMachineRenderer = require('./JobMachineRenderer')
, JobMachineView = module.exports = MachineView.extend({
    className: 'job-machine',
    tagName: 'canvas',

    initialize: function() {
        var self = this
        MachineView.prototype.initialize.apply(self, arguments)

        self.renderer = new JobMachineRenderer({
            credits: Math.floor(app.user.get('balance') / 1e5),
            cards: self.model.get('hand') && self.model.get('hand').at(0).get('value') ? self.model.get('hand').pluck('value') : null,
            bet: self.model.get('bet'),
            paytable: self.model.get('paytable'),
            canvas: this.el,
            payTable: job.payouts[self.model.get('paytable')]
        })

        self.renderer.onDraw = function(held) {
            var message = { hold: [] }

            for (var i = 0; i < 5; i++) {
                message.hold[i] = held[i]
            }

            self.send('hold', message)
        }

        self.renderer.onDeal = function(bet) {
            self.send('deal', { bet: bet })
        }

        self.subscribe('deal', _.bind(self.onSocketDeal, self))
        self.subscribe('draw', _.bind(self.onSocketDraw, self))
        self.subscribe('jackpot', _.bind(self.onSocketJackpotChange, self))

        self.bindTo(app.user, 'change:balance', function() {
            console.log('balance changed, setting credits to ' + app.user.get('balance') / 1e5)
            self.renderer.credits(Math.floor(app.user.get('balance') / 1e5))
        })
    },

    dispose: function() {
        if (this.renderer) {
            this.renderer.dispose()
            this.renderer = null
        }

        MachineView.prototype.dispose.call(this)
    },

    ratio: 1,

    rect: function(x, y, w, h) {
        this.$el.css({ left: x, top: y })
        this.el.width = w
        this.el.height = h
        this.renderer.resized()
    },

    onSocketJackpotChange: function(message, callback) {
        this.renderer.jackpot(message.current / 1e5)
        callback()
    },

    onSocketDraw: function(message, callback) {
        console.log('draw', message)
        this.renderer.draw(message.drawn, message.payout / 1e5)
        callback()
    },

    onSocketDeal: function(message, callback) {
        this.renderer.deal(message.cards, message.bet)
        _gaq.push(['_trackEvent', 'Machines', 'Bet', 'Jacks or Better', message.bet])
        callback()
    },

    render: function() {
        return this;
    }
})

JobMachineView.model = Models.JobMachine
