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
    , state = 'ready'
    , slowing
    , win = 0
    , credits = 0
    , bet = 1
    , maxReelSpeed = 35
    , spinupAcc = 2
    , self = this
    , stop
    , now
    , queuedCreditsSet
    , redraw = true
    , sw = 450
    , sh = 500
    , winCountTo
    , callback
    , winCountAt

    , settings = {
        buttons: {
            betOne: {
                text: 'BET\nONE',
                x: 50,
                y: 380,
                w: 100,
                h: 80
            },
            betMax: {
                text: 'BET\nMAX',
                x: 180,
                y: 380,
                w: 100,
                h: 80
            },
            spin: {
                text: 'SPIN',
                x: 310,
                y: 380,
                w: 100,
                h: 80
            }
        },
        winCountIncLow: 1,
        winCountIncMiddle: 5,
        winCountIncHigh: 25,
        winCountDelay: 250
    }

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

        ctx.translate(0, 0)
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
            1
        )

        ctx.restore()
    }

    function drawCreditsWinBet() {
        ctx.save()
        ctx.font = '15px scada'
        var labelY = 330
        var numberY = labelY + 17
        var x = [
            100,
            200,
            300
        ]

        ctx.fillStyle = 'yellow'
        ctx.fillText('WIN', x[0], labelY)
        ctx.fillText('CREDITS', x[1], labelY)
        ctx.fillText('BET', x[2], labelY)

        ctx.fillStyle = 'white'
        ctx.fillText(win, x[0], numberY)
        ctx.fillText(credits, x[1], numberY)
        ctx.fillText(bet, x[2], numberY)

        ctx.restore()
    }

    function drawButton(b, state) {
        ctx.save()

        var t = b.text.split('\n')

        var fontSize = 25,
            h = b.h
            ctx.font = fontSize + 'px arial',
            w = b.w
            ctx.translate(b.x, b.y)

            // background
            ctx.fillStyle = state == 'down' ? 'orange' : state == 'disabled' ? 'gray' : 'yellow'
        ctx.fillRect(0, 0, w, h)

        // border
        ctx.strokeStyle = 'white'
        ctx.strokeRect(0, 0, w, h)

        // text
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'black'

        if (t.length == 1) {
            ctx.fillText(b.text, w / 2, h / 2)
        } else {
            ctx.fillText(t[0], w / 2, h * 1 / 3)
            ctx.fillText(t[1], w / 2, h * 3 / 4)
        }

        ctx.restore()
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
        drawCreditsWinBet()
        drawButton(settings.buttons.betOne, state === 'ready' && credits > 0 ? 'up' : 'disabled')
        drawButton(settings.buttons.betMax, state === 'ready' && credits > 0 ? 'up' : 'disabled')
        drawButton(settings.buttons.spin, state === 'ready' && credits > 0 ? 'up' : 'disabled')

        ctx.restore()
    }

    this.spin = function(s, c, cb) {
        speeds = _.map(reels, function() { return 0 })
        reelsMoving = _.map(reels, function() { return true })
        stops = s
        console.log('spinning to stops', s)
        state = 'spinup'
        redraw = true
        winCountTo = c
        callback = cb
    }

    self.stop = function() {
        stop = true
    }

    self.credits = function(c) {
        if (state !== 'ready') {
            console.log('queueing credit set to ' + c +' because not in ready state')
            queuedCreditsSet = c
        } else {
            console.log('setting credits to ' + c + ' and requesting redraw')
            credits = c
            redraw = true
        }
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
                win = 0
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
            redraw = true

            if (win === winCountTo) {
                console.log('done counting')
                state = 'finished'
                return
            }

            if (!winCountAt) {
                console.log('queueing first count')
                winCountAt = now + 500
                return
            }

            if (winCountAt < now) {
                return
            }

            var remain = winCountTo - win
            , inc = remain > 1000 ?
                settings.winCountIncHigh :
                remain > 100 ?
                settings.winCountIncMiddle :
                1

            console.log('counting winnings: remain=' + remain + '; inc=' + inc)

            win += inc
            winCountAt = now + settings.winCountDelay
        } else if (state === 'finished') {
            redraw = true

            console.log('finished (moving into ready state)')

            if (queuedCreditsSet) {
                redraw = credits !== queuedCreditsSet
                credits = queuedCreditsSet
                queuedCreditsSet = null
            }

            winCountAt = null
            winCountTo = null
            state = 'ready'
            callback && callback()
            callback = null
        }
    }

    function pointInRect(x, y, rx, ry, rw, rh) {
        return x >= rx && y >= ry && x <= rx + rw && y <= ry + rh
    }

    function pointInShape(x, y, s) {
        return pointInRect(x, y, s.x, s.y, s.w, s.h)
    }

    function click(e) {
        e.preventDefault()
        e.stopPropagation()

        if (state !== 'ready') {
            console.log('ignoring click made outside ready state')
            return
        }

        var offset = $canvas.offset(),
        x = e.pageX - offset.left,
        y = e.pageY - offset.top
        x = x / (canvas.width / sw)
        y = y / (canvas.height / sh)

        redraw = true

        if (pointInShape(x, y, settings.buttons.betOne)) {
            console.log('bet one clicked, previous bet ' + bet + '; credits ' + credits)
            if (++bet > 3 || bet > credits) bet = 1
        } else if (pointInShape(x, y, settings.buttons.betMax)) {
            if (credits < 1) return
            bet = Math.min(Math.floor(credits), 3)
            self.onSpin(bet)
        } else if (pointInShape(x, y, settings.buttons.spin)) {
            if (credits < 1) return
            self.onSpin(bet)
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

    if (!$('#scada').length) {
        console.log('adding scada font')
        $('head').append('<link href="//fonts.googleapis.com/css?family=Scada:400,700" id="scada" rel="stylesheet" type="text/css" />')
    }

    $canvas = $(canvas)
    $canvas.click(click)
    $canvas.css('pointer', 'default')
    canvas.draggable = false

    loop()
}
