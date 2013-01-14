var Backbone = require('backbone')
, Models = require('../../models')
, app = require('../app')
, _ = require('underscore')
, rwb = require('../../rwb')
, RwbMachineRenderer = require('./RwbMachineRenderer')
, MachineView = require('./MachineView')
, debug = require('debug')('joggy:RwbMachineView')
, RwbMachineView = module.exports = MachineView.extend({
    className: 'rwb-machine',

    initialize: function() {
        var self = this

        MachineView.prototype.initialize.apply(this, arguments)

        debug('initializing ')

        this.$canvas = $('<canvas/>').appendTo(this.$el)
        this.canvas = this.$canvas[0]

        this.fps = 60

        this.vm = new Backbone.Model({
        })

        var renderOptions = {
            canvas: this.canvas,
            reels: rwb.reels,
            credits: app.user.get('credits'),
            rows: 3,
            symbolWidth: 150,
            symbolHeight: 150,
            symbolDims: [
                { x: 0, y: 0, width: 200, height: 200 },
                { x: 200, y: 0, width: 200, height: 200 },
                { x: 0, y: 200, width: 200, height: 200 },
                { x: 200, y: 200, width: 200, height: 200 },
                { x: 400, y: 0, width: 200, height: 200 },
                { x: 400, y: 200, width: 200, height: 200 }
            ]
        }

        this.renderer = new RwbMachineRenderer(renderOptions)
        this.renderer.credits(app.user.get('balance') / 1e5)
        this.renderer.onSpin = function(b) {
            app.user.set('balance', app.user.get('balance') - b * 1e5)
            self.send('spin', { bet: b })
            _gaq.push(['_trackEvent', 'Machines', 'Bet', 'Red, White & Blue', b])
        }

        this.subscribe('spin', this.onSpin, this);

        self.subscribe('jackpot', _.bind(self.onSocketJackpotChange, self))

        self.bindTo(app.user, 'change:balance', function() {
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

    onSocketJackpotChange: function(message, callback) {
        this.renderer.jackpot(message.current / 1e5)
        callback()
    },

    onSpin: function(packet, cb) {
        var self = this

        var stops = _.map(packet.stops, function(s, r) {
            return rwb.lookups[r][s]
        })

        debug('stopping on %s', stops)

        this.renderer.spin(stops, packet.credits, cb)
    },

    ratio: 450 / 600,

    rect: function(x, y, width, height) {
        this.$el.css({
            width: width,
            height: height
        })

        var scale = 450/600
        , w = width / height > scale ? height * scale : width
        , h = width / height < scale ? width / scale : height

        this.$canvas.css({
            'margin-left': width > w ? (width - w) / 2 : 0
        })

        this.canvas.width = w
        this.canvas.height = h

        this.renderer.redraw()
    },

    render: function() {
        return this;
    }
})

RwbMachineView.model = Models.RwbMachine
