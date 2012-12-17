var Backbone = require('backbone')
, _ = require('underscore')
, app = require('../app')
, cu = require('../canvas')
, async = require('async')
, View = require('./View')
, WelcomeView = module.exports = View.extend({
    tagName: 'canvas',

    initialize: function() {
        var self = this
        this.ctx = this.el.getContext('2d')
        this.redraw = true
        this.mousePos = null
        this.sw = 1000
        this.sh = 1000
        this.frame = 0
        //this.$el.click(_.bind(this.onCanvasClick, this))
        this.loop = _.bind(this.loop, this)

        this.buttons = {
            job: {
                image: null,
                x: 300,
                y: 300,
                href: '#jacks-or-better'
            },
            rwb: {
                image: null,
                x: 300,
                y: 500,
                href: '#red-white-and-blue'
            }
        }

        async.parallel({
            fonts: function(next) {
                WebFont.load({
                    google: {
                        families: ['Press Start 2P', 'Rancho']
                    },

                    active: function() {
                        console.log('fonts loaded')
                        next()
                    }
                })
            },

            assets: function(next) {
                cu.loadAssets({
                    job: '/media/job-button.png',
                    rwb: '/media/rwb-button.png'
                }, function(err, a) {
                    if (err) return next(err)
                    self.assets = a
                    self.buttons.job.image = a.job
                    self.buttons.rwb.image = a.rwb
                    console.log('assets loaded', a)
                    next()
                })
            }
        }, function(err) {
            if (err) throw err
            self.loop()
        })
    },

    logic: function() {
        this.redraw = true
    },

    rect: function(x, y, width, height) {
        this.el.width = width
        this.el.height = height
    },

    loop: function() {
        this.logic()
        this.redraw && this.render()
        this.redraw = false
        this.frameRequest = requestAnimationFrame(this.loop)
    },

    dispose: function() {
        this.frameRequest && window.cancelAnimationFrame(this.frameRequest)
        this.frameRequest = null
        View.prototype.dispose.call(this)
        console.log('welcome view disposed')
    },

    ratio: 1 / 1,

    className: 'welcome',

    events: {
        'mousemove': 'onMouseMove',
        'click': 'onMouseClick',
        'mouseout': 'onMouseOut'
    },

    onMouseMove: function(e) {
        this.mousePos = cu.mousePos(this.el, this.sw, this.sh, e)
    },

    onMouseOut: function() {
        this.mousePos = null
    },

    onMouseClick: function(e) {
        e.preventDefault()
        var pos = cu.mousePos(this.el, this.sw, this.sh, e)
        , button = _.find(this.buttons, function(b) { return cu.pointInRect(pos.x, pos.y, b.x, b.y, 300, 150) })
        if (!button) return
        window.location = button.href
    },

    render: function() {
        var self = this
        , ctx = self.ctx
        , w = self.el.width
        , h = self.el.height
        , now = +new Date()

        function drawButton(options) {
            var hovered = self.mousePos && cu.pointInRect(
                self.mousePos.x,
                self.mousePos.y,
                options.x,
                options.y,
                300,
                150)

            ctx.save()

            if (options.image) {
                ctx.drawImage(options.image, 0, 0, 300, 150, options.x, options.y, 300, 150)
            }

            ctx.strokeStyle = hovered ? '#339955' : '#333'
            ctx.lineWidth = hovered ? 10 : 5
            ctx.strokeRect(options.x, options.y, 300, 150)
            ctx.restore()
        }

        function drawBg() {
            ctx.save()

            var grd = ctx.createRadialGradient(238, 50, 10, 238, 50, 300)
            grd.addColorStop(0, '#FFF')
            grd.addColorStop(1, '#EEE')
            ctx.fillStyle = grd
            ctx.fillRect(0, 0, self.sw, self.sh)

            ctx.restore()
        }

        ctx.save()
        ctx.scale(self.el.width / self.sw, self.el.height / self.sh)

        drawBg()

        _.each(self.buttons, drawButton, self)

        ctx.restore()

        self.frame++

        return self
    }
})