var cu = require('../../canvas')
, debug = function(s) {
    console.log('[KittyMinigame] ' + s)
}
, app = require('../../app')
, drawPositions = [
    { x: 50, y: 73 },
    { x: 130, y: 73 },
    { x: 210, y: 73 }
]

function Kitty(hint, alternatives) {
    this.loop = _.bind(this.loop, this)
    this.alternatives = alternatives
    this.hint = hint
    this.answer = null
    this.counter = null
}

Kitty.prototype.init = function(canvas) {
    var self = this
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.redraw = true
    this.$canvas = $(canvas)
    this.$canvas.click(_.bind(this.onCanvasClick, this))

    debug('loading fonts...')

    cu.loadAssets({ symbols: '/media/kitty/symbols.png' }, function(err, a) {
        if (err) throw new Error('image load failure')
        debug('assets loaded, starting counter')

        self.stopAt = +new Date() + 10000
        self.assets = a
        self.loop()
    })
}

Kitty.prototype.onCanvasClick = function(e) {
    e.preventDefault()

    if (!this.assets) return debug('ignoring click before assets have been loaded')
    if (this.answer !== null) return debug('ignoring duplicate click')

    var offset = this.$canvas.offset()
    , x = e.pageX - offset.left
    , y = e.pageY - offset.top

    for (var i = 0; i < 3; i++) {
        if (x >= drawPositions[i].x &&
            x <= drawPositions[i].x + 50 &&
            y >= drawPositions[i].y &&
            y <= drawPositions[i].y + 50
        ) {
            this.answer = i
            debug('sending answer (' + i + ' at ' + this.counter + ')')
            app.socket.emit('kitty', { answer: i, time: this.counter })
            this.redraw = true
            _gaq.push(['_trackEvent', 'Contest', 'Guess', 'Kitty', this.counter])
            return
        }
    }

    debug('ignoring click outside alternatives (' + x + ', ' + y + ')')
}

Kitty.prototype.dispose = function() {
    this.frameRequest && window.cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
    debug('disposed')
}

Kitty.prototype.render = function() {
    var ctx = this.ctx
    , w = this.canvas.width
    , h = this.canvas.height
    , now = +new Date()

    ctx.save()

    ctx.clearRect(0, 0, w, h)

    // hint text ("Click the dog close to zero!")
    ctx.font = '14px Arial'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.fillText('Click ' + this.hint + ' close to zero!', w / 2, 20)

    ctx.font = '40px Arial'

    if (this.counter) {
        if (this.answer !== null) {
            ctx.fillStyle = 'green'
        }
    } else {
        ctx.fillStyle = 'red'
    }

    ctx.fillText(this.counter || 'too slow', w / 2, 60)

    for (i = 0; i < 3; i++) {
        ctx.drawImage(
            this.assets.symbols,
            this.alternatives[i].x,
            this.alternatives[i].y,
            50,
            50,
            drawPositions[i].x,
            drawPositions[i].y,
            50,
            50
        )

        if (this.answer === i) {
            ctx.strokeStyle = '#0000FF'
            ctx.lineWidth = 3
            ctx.strokeRect(
                drawPositions[i].x,
                drawPositions[i].y,
                50,
                50
            )
        }
    }

    ctx.restore()
}

Kitty.prototype.logic = function() {
    if (this.counter !== 0 && this.answer === null) {
        this.counter = Math.max(0, Math.floor((this.stopAt - +new Date()) / 10))
        this.redraw = true
    }
}

Kitty.prototype.loop = function() {
    this.logic()
    this.redraw && this.render()
    this.redraw = false
    this.frameRequest = requestAnimationFrame(this.loop)
}

module.exports = Kitty
