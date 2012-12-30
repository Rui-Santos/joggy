var Backbone = require('backbone')
, _ = require('underscore')
, app = require('../app')
, cu = require('../canvas')
, async = require('async')
, View = require('./View')
, cu = require('../canvas')
, WelcomeView = module.exports = View.extend({
    initialize: function() {
        var self = this

        this.$kinetic = $('<div/>')

        this.stage = new Kinetic.Stage({
            container: this.$kinetic[0],
            width: this.size.x,
            height: this.size.y
        })

        this.layer = new Kinetic.Layer({
        })

        cu.loadAssets({
            'logo': '/media/logo.png',
            'job': '/media/job-button.png',
            'rwb': '/media/rwb-button.png'
        }, function(err, a) {
            self.assets = a
            self.render()
        })
    },

    rect: function(x, y, width, height) {
        this.$el.css({
            width: width,
            height: height
        })

        var scale = this.size.x / this.size.y
        , w = width / height > scale ? height * scale : width
        , h = width / height < scale ? width / scale : height

        this.$kinetic.css({
            'margin-left': width > w ? (width - w) / 2 : 0
        })

        this.stage.setWidth(w)
        this.stage.setHeight(h)
        this.layer.setScale(w / this.size.x, h / this.size.y)
    },

    size: { x: 990, y: 845 },

    className: 'welcome',

    render: function() {
        var self = this
        if (this.rendered || !this.assets) return this
        this.rendered = true

        var debugBackground = new Kinetic.Rect({
            width: this.size.x,
            height: this.size.y,
            fill: 'red'
        })
        //this.layer.add(debugBackground)

        var logoGroup = new Kinetic.Group({
            id: 'logo-group',
            x: 0,
            y: 50
        })
        var logo = new Kinetic.Image({
            id: 'logo-image',
            image: this.assets.logo,
            x: 200,
            y: 10
        })
        var logoBg = new Kinetic.Rect({
            fill: {
            start: {
              x: 0,
              y: 0
            },
            end: {
              x: 990,
              y: 845
            },
            colorStops: [0, '#ffffff', 1, '#eee']
          },
            //stroke: 'black',
            //strokeWidth: '4',
            width: 990,
            height: 240,
            cornerRadius: 10
        })
        logoGroup.add(logoBg)
        logoGroup.add(logo)

        function drawGameButton(name, x, y, href) {
            var grp = new Kinetic.Group({
                x: x,
                y: y
            })

            var bg = new Kinetic.Rect({
                width: 325,
                height: 175,
                fill: 'white',
                cornerRadius: 10
            })
            grp.add(bg)

            var img = new Kinetic.Image({
                image: self.assets[name],
                strokeWidth: 4,
                y: 10,
                x: 10
            })
            grp.add(img)

            img.on('mouseover', function() {
                bg.setStroke('black')
                self.layer.draw()
            })

            img.on('mouseout', function() {
                bg.setStroke('white')
                self.layer.draw()
            })

            img.on('click', function() {
                window.location = href
            })

            self.layer.add(grp)
        }

        drawGameButton('job', 0, 320, '#jacks-or-better')
        drawGameButton('rwb', 360, 320, '#red-white-and-blue')

        this.layer.add(logoGroup)

        this.stage.add(this.layer)

        this.$el.append(this.$kinetic)

        return this
    }
})
