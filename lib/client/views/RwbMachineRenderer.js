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
    , context = canvas.getContext('2d')
    , timer = null
    , state = null
    , slowing
    , maxReelSpeed = 35
    , spinupAcc = 2
    , self = this
    self.scale = options.scale || 1

    self.render = function() {
        var reel
        , row
        , reelIndex
        , symbolOffset
        , symbolIndex
        , x
        , y

        context.save()
        console.log('scaling to', self.scale)
        context.scale(self.scale, self.scale)
        context.beginPath()
        context.drawImage(bg, 0, 0)
        context.rect(0, 0, symbolWidth * reels.length, symbolHeight * (rows - 1))
        context.clip()

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

                console.log('drawing symbol', symbolIndex, 'to', x, y)

                context.drawImage(
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

        context.restore()
    }

    function spindownTick() {
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
                , distance = positions[reel] - stopPixel
                if (Math.abs(distance) < maxReelSpeed) {
                    positions[reel] = stopPixel
                    speeds[reel] = 0
                }
            }
        }

        self.render()
    }

    function spinTick() {
        if (state === 'spinup') spinupTick()
        else if (state === 'spindown') spindownTick()
        else if (state === 'reward') rewardTick()
    }

    function rewardTick() {
        clearTimeout(timer)
    }

    function spinupTick() {
        var allReelsAtMaxSpeed = true
        , reel
        , stopSpot

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

        self.render()
    }

    this.spin = function() {
        speeds = _.map(reels, function() { return 0 })
        reelsMoving = _.map(reels, function() { return true })
        stops = [7, 2, 3.5]
        state = 'spinup'
        timer = setInterval(spinTick, 1000 / 60)
    }

    self.render()
}