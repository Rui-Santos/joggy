var expect = require('expect.js')
, Blackjack = require('../../../lib/server/controllers/BjMachine')
, BlackjackModel = require('../../../lib/models/BjMachine')
, bj = require('../../../lib/bj')
, _ = require('underscore')

describe('BjMachine', function() {
    describe('constructor', function() {
        it('callback', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , done
            , table = new Blackjack(model, {
                callback: function() {
                    done = true
                }
            })

            expect(done).to.be.ok()
            clearInterval(table.ejectIdleUsersTimer)
            clearTimeout(table.endBettingTimer)
        })
    })

    describe('eject', function() {
        it('clears user', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            model.get('boxes')[0].user = {}

            table.eject(0)
            expect(model.get('boxes')[0].user).to.be(null)

            clearInterval(table.ejectIdleUsersTimer)
        })

        it('throws if box is not occupied', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.eject(0)
            }).to.throwError(/empty/)

            clearInterval(table.ejectIdleUsersTimer)
        })

        it('throws if box is out of range', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.eject(10)
            }).to.throwError(/exist/)

            clearInterval(table.ejectIdleUsersTimer)
        })

        it('throws if not in the betting state', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            model.set({ state: 'not betting' })
            model.get('boxes')[0].user = {}

            expect(function() {
                table.eject(0)
            }).to.throwError(/state/)

            clearInterval(table.ejectIdleUsersTimer)
        })
    })

    describe('bet', function() {
        it('calls user.wager', function(done) {
            var model = new BlackjackModel({ _id: 'test', rules: { decisionTime: 10000 } })
            , table = new Blackjack(model, { callback: function() { } })
            , wagered
            , p = {
                model: {
                    id: '123',
                    get: function() {
                        return 'alice'
                    }
                },

                wager: function(s, r, cb) {
                    expect(s).to.be(5e8)
                    expect(r).to.be.ok()
                    cb()
                }
            }

            model.get('boxes')[0].user = p

            table.bet(0, 5e8, function(err) {
                table.endBettingTimer && clearTimeout(table.endBettingTimer)
                clearInterval(table.ejectIdleUsersTimer)
                done(err)
            })
        })
    })

    describe('onClientStand', function() {
    })

    describe('deal', function() {
        it('fails if state is not betting', function(done) {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set('state', 'not betting')

            table.deal(function(err) {
                expect(err).to.be.ok()
                expect(err.message).to.match(/state/)
                clearTimeout(table.ejectIdleUsersTimer)
                done()
            })
        })

        it('fails if there are no boxes to deal to', function(done) {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            table.deal(function(err) {
                expect(err).to.be.ok()
                expect(err.message).to.match(/box/)
                clearTimeout(table.ejectIdleUsersTimer)
                done()
            })
        })

        it('fails if a callback is not passed', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.deal(null)
            }).to.throwError(/callback/)

            clearTimeout(table.ejectIdleUsersTimer)
        })

        it('shuffles', function(done) {
            var model = new BlackjackModel({ _id: 'test', rules: { decisionTime: 10000 } })
            , table = new Blackjack(model, { callback: function() { } })
            , user = { }
            , box = model.attributes.boxes[0]
            box.user = user
            box.bet = 1e8

            var cards = require('../../../lib/cards')
            , orig = cards.shuffle
            , deck = [1, 2, 3, 4]

            cards.shuffle = function() {
                return deck
            }

            table.deal(function(err) {
                table.turnTimer && clearTimeout(table.turnTimer)
                expect(model.attributes.deck).to.eql(deck)
                clearTimeout(table.ejectIdleUsersTimer)
                done(err)
            })
        })

        it('deals to dealer first', function(done) {
            var model = new BlackjackModel({ _id: 'test', rules: { decisionTime: 10000 } })
            , table = new Blackjack(model, { callback: function() { } })
            , user = { }
            , box = model.attributes.boxes[0]
            box.user = user
            box.bet = 1e8

            var cards = require('../../../lib/cards')
            , orig = cards.shuffle
            , deck = [1, 2, 3, 4]

            cards.shuffle = function() {
                return deck
            }

            table.deal(function(err) {
                table.turnTimer && clearTimeout(table.turnTimer)
                expect(model.attributes.dealer).to.eql([1, 2])
                cards.shuffle = orig
                clearTimeout(table.ejectIdleUsersTimer)
                done(err)
            })
        })

        it('deals to boxes in order', function(done) {
            var model = new BlackjackModel({ _id: 'test', rules: { decisionTime: 10000 } })
            , table = new Blackjack(model, { callback: function() { } })

            model.attributes.boxes = [{
                index: 0,
                user: {},
                bet: 1e8
            }, {
                user: {},
                bet: 1e8
            }]

            var cards = require('../../../lib/cards')
            , orig = cards.shuffle
            , deck = [1, 2, 3, 4, 5, 6]

            cards.shuffle = function() {
                return deck
            }

            table.deal(function(err) {
                table.turnTimer && clearTimeout(table.turnTimer)
                expect(model.attributes.boxes[0].hands[0].cards).to.eql([3, 4])
                expect(model.attributes.boxes[1].hands[0].cards).to.eql([5, 6])
                cards.shuffle = orig
                clearTimeout(table.ejectIdleUsersTimer)
                done(err)
            })
        })
    })

    describe('getNextTurn', function() {
        it('skips 21s', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.attributes = {
                boxes: [{
                    index: 0,
                    bet: 1,
                    user: {},
                    splits: 0,
                    hands: [{
                        index: 0,
                        bet: 1,
                        cards: [1, 10]
                    }]
                }, {
                    index: 1,
                    bet: 1,
                    user: {},
                    splits: 1,
                    hands: [{
                        index: 0,
                        bet: 1,
                        cards: [1, 10]
                    }, {
                        index: 1,
                        bet: 1,
                        cards: [1, 10]
                    }]
                }, {
                    index: 2,
                    bet: 1,
                    user: {},
                    splits: 0,
                    hands: [{
                        index: 0,
                        bet: 1,
                        cards: [1, 2]
                    }]
                }]
            }

            var actual = table.getNextTurn()
            expect(actual).to.eql([2, 0])

            clearTimeout(table.ejectIdleUsersTimer)
        })
    })

    describe('settle', function() {
        it('calls bj.settle for bj push', function(done) {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set({
                dealer: [bj.card('ac'), bj.card('td')],
                boxes: [{
                    user: {
                        give: function(satoshi) {
                            expect(satoshi).to.be(2e5)
                            _.last(arguments)()
                        }
                    },
                    splits: 0,
                    hands: [{
                        bet: 2e5,
                        cards: [bj.card('as'), bj.card('kh')]
                    }]
                }]
            })

            var called
            bj.settle_orig = bj.settle
            bj.settle = function(splits, hand, dealer, showdown) {
                called = true
                expect(splits).to.be(0)
                expect(hand).to.eql([bj.card('as'), bj.card('kh')])
                expect(dealer).to.eql([bj.card('ac'), bj.card('td')])
                return 1
            }

            table.settle(function(err) {
                bj.settle = bj.settle_orig
                expect(called).to.be(true)
                clearTimeout(table.ejectIdleUsersTimer)
                done()
            })
        })

        it('calls bj.settle for lose vs dealer bj', function(done) {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set({
                dealer: [bj.card('ac'), bj.card('td')],
                boxes: [{
                    user: {
                        give: function(satoshi) {
                            throw new Error('player being given ' + satoshi + ' on lose')
                        }
                    },
                    splits: 0,
                    hands: [{
                        bet: 2e5,
                        cards: [bj.card('as'), bj.card('as')]
                    }]
                }]
            })

            var called
            bj.settle_orig = bj.settle
            bj.settle = function(splits, hand, dealer, showdown) {
                called = true
                expect(splits).to.be(0)
                expect(hand).to.eql([bj.card('as'), bj.card('as')])
                expect(dealer).to.eql([bj.card('ac'), bj.card('td')])
                return 0
            }

            table.settle(function(err) {
                bj.settle = bj.settle_orig
                expect(called).to.be(true)
                clearTimeout(table.ejectIdleUsersTimer)
                done()
            })
        })
    })

    describe('dealerNeedsToDraw', function() {
        it('respects the soft 17 rule (on)', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set({
                dealer: [bj.card('ad'), bj.card('4d'), bj.card('2c')],
                rules: {
                    hitSoft17: true
                }
            })

            expect(table.dealerNeedsToDraw()).to.be(true)
            clearTimeout(table.ejectIdleUsersTimer)
        })

        it('respects the soft 17 rule (off)', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set({
                dealer: [bj.card('ad'), bj.card('4d'), bj.card('2c')],
                rules: {
                    hitSoft17: false
                }
            })

            expect(table.dealerNeedsToDraw()).to.be(false)
            clearTimeout(table.ejectIdleUsersTimer)
        })

        it('does not draw if it has 21', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set({
                dealer: [bj.card('td'), bj.card('kh'), bj.card('ac')],
            })

            expect(table.dealerNeedsToDraw()).to.be(false)
            clearTimeout(table.ejectIdleUsersTimer)
        })

        it('stops on hard 17', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.set({
                dealer: [bj.card('td'), bj.card('7c')],
            })

            expect(table.dealerNeedsToDraw()).to.be(false)
            clearTimeout(table.ejectIdleUsersTimer)
        })
    })
})
