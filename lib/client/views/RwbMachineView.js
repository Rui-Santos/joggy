var Backbone = require('backbone')
, Models = require('../../models')
, app = require('../app')
, _ = require('underscore')
, rwb = require('../../rwb')
, RwbMachineRenderer = require('./RwbMachineRenderer')
, MachineView = require('./MachineView')
, RwbMachineView = module.exports = MachineView.extend({
    className: 'rwb-machine',

    initialize: function() {
        MachineView.prototype.initialize.apply(this, arguments)

        console.log('initializing rwb machine')

        this.fps = 60

        this.vm = new Backbone.Model({
        })

        this.$el.html('<canvas class="canvas"></canvas><div class="log"></div><div class="credits"></div><button class="spin btn btn-large" data-action="spin">SPIN 1 CREDIT</button>')
        this.$credits = this.$el.find('.credits')
        this.$spin = this.$el.find('.spin')

        app.user.on('change:balance', this.onBalanceChange, this)

        this.canvas = this.$el.find('.canvas')[0]

        this.loadAssets()

        this.subscribe('spin', this.onSpin, this);

        this.onBalanceChange()
    },

    onBalanceChange: function() {
        var self = this
        self.queue(function(cb) {
            self.$credits.html((app.user.get('balance') / 1e5) + ' CREDITS')
            cb()
        })
    },

    events: {
        'click *[data-action="spin"]': 'clickSpin'
    },

    clickSpin: function(e) {
        e.preventDefault()

        this.$spin.prop('disabled', true).addClass('disabled')
        this.send('spin', { bet: this.model.get('bet') });
        app.user.set('balance', app.user.get('balance') - 3 * 1e5)
    },

    onSpin: function(packet, cb) {
        var self = this
        if (!this.renderer) throw new Error('spin before renderer is ready')

        var stops = _.map(packet.stops, function(s, r) {
            return rwb.lookups[r][s]
        })

        console.log('stopping on', stops)

        this.renderer.spin(stops, function() {
            self.$spin.prop('disabled', false).removeClass('disabled')
            cb()
        })
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
        console.log('assets loaded')

        var renderOptions = {
            canvas: this.canvas,
            logEl: this.$el.find('.log')[0],
            creditsEl: this.$el.find('.credits')[0],
            symbols: this.assets.symbols.img,
            bg: this.assets.bg.img,
            reels: rwb.reels,
            credits: app.user.get('credits'),
            rows: 3,
            scale: this.canvas.width / 300,
            symbolHeight: 100,
            symbolWidth: 100,
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
    },

    ratio: 3 / 2,

    rect: function(x, y, width, height) {
        console.log('setting rwb rect', x, y, width, height)

        this.$el.css({
            left: x,
            top: y,
            width: width,
            height: height,
            'background-color': 'yellow'
        })

        this.canvas.width = width
        this.canvas.height = height

        if (this.renderer) {
            this.renderer.scale = width / 300
            this.renderer.render()
        }
    },

    render: function() {
        return this;
    }
})

RwbMachineView.model = Models.RwbMachine
