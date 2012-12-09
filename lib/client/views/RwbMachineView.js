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

        this.$el.html('<canvas class="canvas"></canvas><div class="log"></div><div class="credits"></div><button data-action="spin">Spin</button>')

        this.canvas = this.$el.find('.canvas')[0]

        this.loadAssets()
    },

    events: {
        'click *[data-action="spin"]': 'clickSpin'
    },

    clickSpin: function(e) {
        e.preventDefault()
        this.renderer.spin([
            1, 2, 3
        ])
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
        var renderOptions = {
            canvas: this.canvas,
            logEl: this.$el.find('.log')[0],
            creditsEl: this.$el.find('.credits')[0],
            symbols: this.assets.symbols.img,
            bg: this.assets.bg.img,
            reels: rwb.reels,
            credits: app.user.get('credits'),
            rows: 3,
            scale: this.scale,
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

        console.log(renderOptions)

        this.renderer = new RwbMachineRenderer(renderOptions)
    },

    rect: function(x, y, width, height) {
        this.$el.css({
            left: x,
            top: y,
            width: width,
            height: height,
            'background-color': 'yellow'
        })

        this.$el.canvas

        var baseSize = 300
        , size = width > height ? height : width
        , scale = size / baseSize

        this.canvas.width = size
        this.canvas.height = size

        this.scale = scale
    },

    render: function() {
        return this;
    }
})

RwbMachineView.model = Models.RwbMachine
