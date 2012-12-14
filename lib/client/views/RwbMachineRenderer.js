var _ = require('underscore')
, Renderer = module.exports = function(options) {
    var canvas = options.canvas
    , reels = options.reels
    , rows = options.rows
    , symbolHeight = options.symbolHeight
    , symbolWidth = options.symbolWidth
    , symbolDims = options.symbolDims
    , symbols = options.symbols
    , bg = options.bg
    , positions = _.map(reels, function(r) { return 0 })
    , heights = _.map(reels, function(r) { return r.length * symbolHeight })
    , ctx = canvas.getContext('2d')
    , timer = null
    , state = null
    , slowing
    , maxReelSpeed = 35
    , spinupAcc = 2
    , self = this
    , callback
    , stop
    , now
    , redraw = true
    , sw = 450
    , sh = 750

    function drawReels() {
        var reel
        , row
        , reelIndex
        , symbolOffset
        , symbolIndex
        , x
        , y

        ctx.save()

        ctx.beginPath()

        ctx.translate(0, 300)
        ctx.rect(0, 0, symbolWidth * reels.length, symbolHeight * (rows - 1))
        ctx.clip()

        ctx.drawImage(bg, 0, 0, symbolWidth * reels.length, symbolHeight * (rows - 1))

        for (reel = 0; reel < reels.length; reel++) {
            for (row = 0; row <= rows; row++) {
                reelIndex = Math.floor(positions[reel] / symbolHeight) + row
                symbolOffset = positions[reel] % symbolHeight

                if (reelIndex >= reels[reel].length) {
                    reelIndex -= reels[reel].length
                }

                symbolIndex = reels[reel][reelIndex]
                x = reel * symbolWidth
                y = row * symbolHeight - symbolOffset - symbolHeight * 0.5

                ctx.drawImage(
                    symbols,
                    symbolDims[symbolIndex].x,
                    symbolDims[symbolIndex].y,
                    symbolDims[symbolIndex].width,
                    symbolDims[symbolIndex].height,
                    x,
                    y,
                    symbolWidth,
                    symbolHeight
                )
            }
        }

        ctx.strokeStyle = 'red'
        ctx.lineWidth = 4
        ctx.strokeRect(
            0,
            symbolHeight * 1,
            symbolWidth * 3,
            symbolHeight * 1
        )

        ctx.save()
    }

    function drawBackground() {
        ctx.save()
        ctx.fillStyle = '#0000BF'
        ctx.fillRect(0, 0, sw, sh)
        ctx.restore()
    }

    function render() {
        ctx.save()
        ctx.scale(canvas.width / sw, canvas.height / sh)

        drawBackground()
        drawReels()

        ctx.restore()
    }

    this.spin = function(s) {
        speeds = _.map(reels, function() { return 0 })
        reelsMoving = _.map(reels, function() { return true })
        stops = s
        console.log('spinning to stops', s)
        state = 'spinup'
        redraw = true
    }

    self.stop = function() {
        stop = true
    }

    self.redraw = function() {
        redraw = true
    }

    function logic() {
        if (state === 'spinup') {
            var allReelsAtMaxSpeed = true
            , reel
            , stopSpot

            redraw = true

            for (reel = 0; reel < reels.length; reel++) {
                if (!reelsMoving[reel]) continue

                if (speeds[reel] < maxReelSpeed) {
                    if (Math.random() < 0.3) {
                        speeds[reel] += spinupAcc
                    }

                    allReelsAtMaxSpeed = false
                }

                positions[reel] -= speeds[reel]

                if (positions[reel] < 0) {
                    positions[reel] += heights[reel]
                }
            }

            if (allReelsAtMaxSpeed) {
                slowing = _.map(reels, function() { return false })

                state = 'spindown'
            }
        } else if (state === 'spindown') {
            redraw = true

            if (!speeds[reels.length - 1]) {
                state = 'reward'
                console.log('reward')
                return
            }

            for (var reel = 0; reel < reels.length; reel++) {
                positions[reel] -= speeds[reel]

                if (positions[reel] < 0) {
                    positions[reel] += heights[reel]
                }

                if (!reel || !speeds[reel - 1]) {
                    var stopPixel = (stops[reel] - 1) * symbolHeight
                    if (stopPixel < 0) stopPixel += heights[reel]
                    var distance = positions[reel] - stopPixel
                    if (Math.abs(distance) < maxReelSpeed) {
                        positions[reel] = stopPixel
                        speeds[reel] = 0
                    }
                }
            }
        } else if (state === 'reward') {
            state = 'ready'
        }
    }

    function loop() {
        if (stop) return
        now = +new Date()
        logic()
        redraw && render()
        redraw = false
        requestAnimationFrame(loop)
    }

    loop()
}
