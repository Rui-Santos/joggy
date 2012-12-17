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
    this.stoppedAt = null
    this.selection = null
}

Kitty.prototype.init = function(canvas) {
    var self = this
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.redraw = true
    this.frame = 0
    this.$canvas = $(canvas)
    this.$canvas.click(_.bind(this.onCanvasClick, this))
    this.failed = false

    debug('loading fonts...')

    cu.loadAssets({ symbols: '/media/kitty/symbols.png' }, function(err, a) {
        if (err) throw new Error('image load failure')
        self.stopAt = +new Date() + 10000
        self.assets = a
        self.loop()
    })
}

Kitty.prototype.onCanvasClick = function(e) {
    e.preventDefault()

    if (this.selection !== null || this.stopAt <= +new Date()) {
        return
    }

    var offset = this.$canvas.offset()
    , x = e.pageX - offset.left
    , y = e.pageY - offset.top

    console.log('click ' + x + ' ' + y)

    for (var i = 0; i < 3; i++) {
        console.log(this.alternatives[i].x + ' ' + this.alternatives[i].y)

        if (x >= drawPositions[i].x &&
            x <= drawPositions[i].x + 50 &&
            y >= drawPositions[i].y &&
            y <= drawPositions[i].y + 50) {
            console.log(i)
            this.selection = i
            this.redraw = true
            app.socket.emit('kitty', { answer: i, time: this.counter })
            break
        }
    }
}

Kitty.prototype.dispose = function() {
    this.frameRequest && window.cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
}

Kitty.prototype.render = function() {
    var ctx = this.ctx
    , w = this.canvas.width
    , h = this.canvas.height
    , now = +new Date()

    ctx.save()

    ctx.clearRect(0, 0, w, h)

    ctx.font = '14px Arial'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.fillText('Click ' + this.hint + ' close to zero!', w / 2, 20)

    ctx.font = '40px Arial'

    if (this.failed) {
        ctx.fillStyle = 'red'
    } else if (this.selection !== null) {
        ctx.fillStyle = 'green'
    }

    ctx.fillText(this.counter, w / 2, 60)

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

        if (this.selection === i) {
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

    this.frame++
}

Kitty.prototype.logic = function() {
    if (this.selection === null && !this.failed) {
        this.redraw = true
        this.counter = Math.floor((this.stopAt - +new Date()) / 10)

        if (this.counter <= 0) {
            this.counter = 0
            this.failed = true
        }
    }
}

Kitty.prototype.loop = function() {
    this.logic()
    this.redraw && this.render()
    this.redraw = false
    this.frameRequest = requestAnimationFrame(this.loop)
}

module.exports = Kitty
