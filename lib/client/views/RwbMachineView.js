var Backbone = require('backbone')
, Models = require('../../models')
, app = require('../app')
, _ = require('underscore')
, rwb = require('../../rwb')
, RwbMachineRenderer = require('./RwbMachineRenderer')
, MachineView = require('./MachineView')
, RwbMachineView = module.exports = MachineView.extend({
    className: 'rwb-machine',
    tagName: 'canvas',

    initialize: function() {
        var self = this

        MachineView.prototype.initialize.apply(this, arguments)

        console.log('initializing rwb machine')

        this.fps = 60

        this.vm = new Backbone.Model({
        })

        this.loadAssets()

        this.subscribe('spin', this.onSpin, this);

        app.user.on('change:balance', function() {
            if (self.renderer) {
                self.renderer.credits(Math.floor(app.user.get('balance') / 1e5))
            }
        })
    },

    onSpin: function(packet, cb) {
        var self = this
        if (!this.renderer) throw new Error('spin before renderer is ready')

        var stops = _.map(packet.stops, function(s, r) {
            return rwb.lookups[r][s]
        })

        console.log('stopping on', stops)

        this.renderer.spin(stops, packet.credits, cb)
    },

    loadAssets: function() {
        var self = this

        console.log('loading assets')

        this.assets = {
            'symbols': {
                src: '/media/rwb/symbols.png'
            },

            'bg': {
                src: '/media/rwb/bg.png'
            }
        }

        var remaining = _.keys(this.assets).length

        _.each(this.assets, function(a) {
            a.img = new Image()
            a.img.src = a.src
            a.img.onload = function() {
                console.log('asset loaded ' + a.img.src)
                if (!--remaining) self.assetsLoaded()
            }
            a.img.onerror = function(e) {
                throw e
            }
            console.log('loading asset ' + a.img.src)
        })
    },

    assetsLoaded: function() {
        var self = this

        console.log('assets loaded')

        var renderOptions = {
            canvas: this.el,
            symbols: this.assets.symbols.img,
            bg: this.assets.bg.img,
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
        }
    },

    ratio: 450 / 500,

    rect: function(x, y, w, h) {
        this.$el.css({ left: x, top: y })
        this.el.width = w
        this.el.height = h

        if (this.renderer) {
            this.renderer.redraw()
        }
    },

    render: function() {
        return this;
    }
})

RwbMachineView.model = Models.RwbMachine
