var cu = require('../../canvas')
, debug = require('debug')('joggy:WelcomeMinigame')

function Welcome() {
    this.loop = _.bind(this.loop, this)
}

Welcome.prototype.init = function(canvas) {
    var self = this
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.redraw = true
    this.frame = 0

    debug('loading fonts...')

    WebFont.load({
        google: {
            families: ['Rancho']
        },

        active: function(name, fvd) {
            self.loop()
        }
    })
}

Welcome.prototype.dispose = function() {
    this.frameRequest && window.cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
}

Welcome.prototype.render = function() {
    var ctx = this.ctx
    , w = this.canvas.width
    , h = this.canvas.height

    ctx.save()

    ctx.clearRect(0, 0, w, h)

    ctx.font = '80px Rancho'
    ctx.fillStyle = '#FF2222'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#333333'
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.shadowBlur = 5
    ctx.fillText('Welcome!', w / 2, h / 2)

    ctx.restore()

    this.frame++
}

Welcome.prototype.loop = function() {
    this.redraw && this.render()
    this.redraw = false
    this.frameRequest = requestAnimationFrame(this.loop)
}

module.exports = Welcome
