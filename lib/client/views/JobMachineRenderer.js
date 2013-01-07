var _ = require('underscore')
, cu = require('../canvas')
, debug = function(s) { console.log('[JobRenderer] ' + s) }
, job = require('../vp-job')

    function JacksOrBetter(options) {
        debug('renderer constructing')

        var self = this,
            canvas = options.canvas,
            ctx = canvas.getContext('2d'),
            sw = 500,
            sh = 500,
            assets,
            sm = require('../../../assets/card-sprites.json'),
            cards = options.cards || [13, 12, 11, 10, 9],
            state = options.cards ? 'hold' : 'bet',
            frame = 0,
            timer, winRank = options.cards ? null : 8,
            bet = options.bet || 1,
            $canvas, credits = options.credits || 0,
            win = 0,
            scale = 1,
            dealQueue, dealQueueAt, drawQueue, winCountTo, pendingSetCredits, jackpot = options.jackpot,
            winCountAt, winCountSpeed, drawQueueAt, now, held = options.cards ? [false, false, false, false, false] : [true, true, true, true, true],
            payTable = options.payTable,
            yellow = '#DDDD22',
            s = {
                payTable: {
                    x: 5,
                    y: 5,
                    w: sw - 10,
                    h: 205,
                    dividers: [
              200, 200 + 48,
              200 + 48 + 55,
              200 + 48 + 55 + 55,
              200 + 48 + 55 + 55 + 55],
                    labels: [
                'royal flush . . . . .',
                'straight flush . .',
                '4 of a kind . . . . . . .',
                'full house . . . . . .',
                'flush . . . . . . . . . . . .',
                'straight . . . . . . . . .',
                '3 of a kind . . . . . . .',
                '2 pair . . . . . . . . . . . .',
                'jacks or better . .'
            ],
                    font: '19px "scada"',
                    lineHeight: 20,
                    boldFont: 'bold 20px "scada"',
                    color: yellow,
                    altBackground: '#0000BF',
                    highlightedBackground: '#B31B1B'
                },
                card: {
                    x: 5,
                    y: 260,
                    w: 94,
                    h: Math.round(94 * 1.452),
                    marginRight: 5
                },
                background: '#00009E',
                heldFont: '18px "scada"',
                buttons: {
                    deal: {
                        text: 'DEAL',
                        x: 415,
                        y: 445,
                        w: 80,
                        h: 50
                    },
                    betOne: {
                        text: 'BET\nONE',
                        x: 325,
                        y: 445,
                        w: 80,
                        h: 50
                    },
                    betMax: {
                        text: 'BET\nMAX',
                        x: 235,
                        y: 445,
                        w: 80,
                        h: 50
                    }
                }
            }

        init()

        var cardName = _.memoize(function (i) {
            return ['2', '3', '4', '5', '6', '7', '8', '9', 't', 'j', 'q', 'k', 'a'][(i - 1) % 13] + ['s', 'h', 'd', 'c'][Math.floor((i - 1) / 13)]
        })

            function loop() {
                now = +new Date()
                logic()
                redraw && render()
                redraw = false
                self.frameRequest = requestAnimationFrame(loop)
            }

            function init() {
                debug('loading assets')

                cu.loadAssets({
                    cards: '/media/cards.png'
                }, function (err, a) {
                    if (err) {
                        console.error('failed to load asset ' + a.src)
                        throw err
                    }

                    assets = a
                    redraw = true
                })

                WebFont.load({
                    google: {
                        families: ['Scada']
                    },

                    active: function() {
                        redraw = true
                    }
                })

                $canvas = $(canvas)
                $canvas.click(click)
                $canvas.attr('unselectable', 'on')
                    .css('user-select', 'none')
                    .on('selectstart', false)
                $canvas.css('pointer', 'default')

                canvas.draggable = false

                redraw = true

                loop()
            }

            function settle() {
                winRank = job.rank(cards)
                win = 0
                redraw = true

                if (!winCountTo) {
                    if (pendingSetCredits) {
                        debug('setting credits to pending ' + pendingSetCredits)
                        credits = pendingSetCredits
                    }

                    pendingSetCredits = null
                    state = 'bet'
                    return
                }

                state = 'settling'
                winCountAt = 0
                winCountSpeed = winCountTo > 1000 ? 10 : winCountTo > 100 ? 5 : 1
            }

            function logic() {
                if (state === 'dealing' && now >= dealQueueAt) {
                    redraw = true

                    var index = cards.indexOf(null),
                        card = dealQueue.shift()
                        cards[index] = card

                    if (dealQueue.length) {
                        dealQueueAt = now + 100
                    } else {
                        state = 'hold'
                    }
                } else if (state == 'drawing' && now >= drawQueueAt) {
                    redraw = true

                    var index = cards.indexOf(null),
                        card = drawQueue.shift()
                        cards[index] = card

                    if (drawQueue.length) {
                        drawQueueAt = now + 100
                    } else {
                        settle()
                    }
                } else if (state == 'settling' && now >= winCountAt) {
                    redraw = true

                    if (win + winCountSpeed >= winCountTo) {
                        credits += winCountTo - win
                        win = winCountTo
                        state = 'bet'
                        return
                    }

                    win += winCountSpeed
                    credits += winCountSpeed
                    winCountAt = now + 100
                } else if (state === 'bet') {
                    if (bet > credits) {
                        bet = credits || 1
                        redraw = true
                    }
                }
            }

        self.deal = function (dealtCards) {
            cards = [null, null, null, null, null]
            held = [false, false, false, false, false]
            dealQueue = dealtCards
            dealQueueAt = now + 500
            state = 'dealing'
            redraw = true
        }

        self.resized = function () {
            redraw = true
        }

        self.draw = function (drawnCards, c) {
            winCountTo = c
            if (!drawnCards.length) return settle()
            drawQueue = drawnCards
            drawQueueAt = now + 500
            state = 'drawing'
            redraw = true
        }

        self.dispose = function () {
            self.frameRequest && cancelAnimationFrame(self.frameRequest)
            self.frameRequest = null
            debug('disposed')
        }

        self.jackpot = function (jp) {
            jackpot = jp
            redraw = true
        }

        self.credits = function (c) {
            if (state == 'settling' || state == 'waitdraw') {
                debug('pending credits to ' + c)
                pendingSetCredits = c
            } else {
                debug('setting credits to ' + c)
                pendingSetCredits = null
                credits = c
            }
            redraw = true
        }

        function click(e) {
            e.preventDefault()
            var offset = $canvas.offset(),
                x = e.pageX - offset.left,
                y = e.pageY - offset.top
                x = x / (canvas.width / sw)
                y = y / (canvas.height / sh)

                if (state == 'hold') {
                    // cards
                    for (var i = 0; i < 5; i++) {
                        if (pointInRect(x, y, s.card.x + i * (s.card.w + s.card.marginRight), s.card.y, s.card.w, s.card.h)) {
                            held[i] = !held[i]
                            debug('held ' + held.join())
                            redraw = true
                        }
                    }

                    // deal button
                    if (pointInShape(x, y, s.buttons.deal)) {
                        for (var i = 0; i < 5; i++) {
                            if (!held[i]) cards[i] = null
                        }
                        state = 'waitdraw'
                        self.onDraw && self.onDraw(held)
                        redraw = true
                    }
                }

            if (state == 'bet') {
                // bet one
                if (pointInShape(x, y, s.buttons.betOne)) {
                    if (++bet > 5 || bet > credits) {
                        bet = 1
                    }

                    winRank = null
                    redraw = true
                }

                if (pointInShape(x, y, s.buttons.betMax)) {
                    if (credits > 0) {
                        bet = Math.min(credits, 5)
                        debug('bet max, ' + bet)
                        winRank = null
                        credits -= bet
                        state = 'waitdeal'
                        self.onDeal && self.onDeal(bet)
                        redraw = true
                    }
                }

                // deal
                if (pointInShape(x, y, s.buttons.deal)) {
                    if (credits > 0) {
                        debug('deal clicked')
                        winRank = null
                        credits -= bet
                        state = 'waitdeal'
                        self.onDeal && self.onDeal(bet)
                        redraw = true
                    }
                }
            }

            render()
        }

        function pointInRect(x, y, rx, ry, rw, rh) {
            return x >= rx && y >= ry && x <= rx + rw && y <= ry + rh
        }

        function pointInShape(x, y, s) {
            return pointInRect(x, y, s.x, s.y, s.w, s.h)
        }

        function mousePos(evt) {
            var rect = canvas.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            }
        }

        function drawButton(b, state) {
            ctx.save()

            var t = b.text.split('\n')

            var fontSize = 17,
                h = b.h
                ctx.font = fontSize + 'px scada',
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

        function drawCards() {
            ctx.save()
            for (var i = 0; i < 5; i++) {
                cu.drawFromSpriteMap(
                assets.cards,
                sm, !cards[i] ? 'back.png' : cardName(cards[i]) + '.png',
                ctx,
                s.card.x + i * s.card.marginRight + i * s.card.w,
                s.card.y,
                s.card.w,
                s.card.h)
            }

            ctx.restore()
        }

        function drawHeld() {
            ctx.save()
            ctx.font = s.heldFont
            ctx.fillStyle = 'white'
            ctx.textAlign = 'center'

            for (var i = 0; i < 5; i++) {
                if (!held[i]) continue
                ctx.fillText(
                    'HELD',
                s.card.x + s.card.w / 2 + i * (s.card.w + s.card.marginRight),
                s.card.y - 15)
            }


            ctx.restore()
        }

        function drawBackground() {
            ctx.save()
            ctx.fillStyle = s.background
            ctx.fillRect(0, 0, sw, sh)
            ctx.restore()
        }

        function drawPaytable() {
            ctx.save()
            ctx.restore()

            // alt row background
            ctx.fillStyle = s.payTable.altBackground
            for (var i = 0; i < 9; i += 2) {
                ctx.fillRect(
                s.payTable.x,
                s.payTable.y + (s.payTable.lineHeight + 2.5) * i + 2,
                s.payTable.w,
                s.payTable.lineHeight + 1.8)
            }

            //highlighted column
            ctx.save()
            ctx.fillStyle = s.payTable.highlightedBackground
            ctx.fillRect(
            s.payTable.dividers[bet - 1],
            s.payTable.y,
            bet == 5 ? s.payTable.w + s.payTable.x - s.payTable.dividers[4] : s.payTable.dividers[bet] - s.payTable.dividers[bet - 1],
            s.payTable.h)
            ctx.restore()

            // yellow lines
            ctx.save()
            ctx.strokeStyle = yellow
            ctx.lineWidth = '2'
            ctx.strokeRect(
            s.payTable.x,
            s.payTable.y,
            s.payTable.w,
            s.payTable.h)

            ctx.beginPath()
            ctx.lineWidth = '1'
            for (var i = 0; i < 5; i++) {
                ctx.moveTo(s.payTable.dividers[i], s.payTable.y)
                ctx.lineTo(s.payTable.dividers[i], s.payTable.y + s.payTable.h)
                ctx.stroke()
            }
            ctx.restore()

            // rank labels
            ctx.save()
            ctx.fillStyle = s.payTable.color
            ctx.font = s.payTable.font

            for (var i = 0; i < s.payTable.labels.length; i++) {
                var label = s.payTable.labels[i].toUpperCase(),
                    y = s.payTable.y + (i + 1) * (s.payTable.lineHeight + 2)

                    // label
                if (winRank == 8 - i) {
                    // highlighted label
                    ctx.save()
                    ctx.fillStyle = '#FFFFFF'
                    ctx.font = s.payTable.boldFont
                    ctx.fillText(label, s.payTable.x + 5, y)
                    ctx.restore()
                } else {
                    ctx.fillText(label, s.payTable.x + 5, y)
                }

                // win amounts
                ctx.save()
                ctx.textAlign = 'right'
                for (var coins = 1; coins <= 5; coins++) {
                    var x = coins == 5 ? s.payTable.x + s.payTable.w - 5 : s.payTable.dividers[coins] - 5,
                        text = jackpot && coins == 5 && i === 0 ? jackpot.toFixed(2) : payTable[coins][s.payTable.labels.length - i - 1]

                    if (winRank == 8 - i && bet == coins) {
                        ctx.save()
                        ctx.font = s.payTable.boldFont
                        ctx.fillStyle = '#FFFFFF'
                        ctx.fillText(text, x, y)
                        ctx.restore()
                    } else {
                        ctx.fillText(text, x, y)
                    }
                }
                ctx.restore()
            }

            ctx.restore()

        }

        function drawCreditsWinBet() {
            ctx.save()
            ctx.font = '15px scada'
            var labelY = s.card.y + s.card.h + 18
            var numberY = labelY + 17
            var x = [
       s.card.x + s.card.w / 4,
       s.card.x + 2 * (s.card.w + s.card.marginRight) + 10,
       s.card.x + 4 * (s.card.w + s.card.marginRight)
     ]

            ctx.fillStyle = yellow
            ctx.fillText('WIN', x[0], labelY)
            ctx.fillText('CREDITS', x[1], labelY)
            ctx.fillText('BET', x[2], labelY)

            ctx.fillStyle = 'white'
            ctx.fillText(win, x[0], numberY)
            ctx.fillText(credits, x[1], numberY)
            ctx.fillText(bet, x[2], numberY)

            ctx.restore()
        }

        function drawLoading() {
            ctx.save()
            var text = 'LOADING, PLEASE WAIT'
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '30px arial'
            ctx.textAlign = 'left'
            ctx.fillText(
            text + new Array((Math.floor(frame / 10)) % 5).join('.'),
            sw / 2 - ctx.measureText(text).width / 2,
            sh / 2)
            ctx.restore()
        }

        function drawButtons() {
            ctx.save()

            var canDeal = (state == 'bet' && credits > 0) || state == 'hold',
                canBetMax = (state == 'bet'),
                canBetOne = (state == 'bet')

                drawButton(s.buttons.deal, canDeal ? 'up' : 'disabled')

                if (canBetOne) {
                    drawButton(s.buttons.betOne, canBetOne ? 'up' : 'disabled')
                }

            if (canBetMax) {
                drawButton(s.buttons.betMax, canBetMax ? 'up' : 'disabled')
            }

            ctx.restore()
        }

        function render() {
            ctx.save()
            ctx.scale(canvas.width / sw, canvas.height / sh)

            drawBackground()

            if (!assets) {
                drawLoading()
            } else {
                drawHeld()
                drawPaytable()
                drawCreditsWinBet()
                drawCards()
                drawButtons()
            }


            ctx.restore()

            frame++
        }
    }

module.exports = JacksOrBetter
