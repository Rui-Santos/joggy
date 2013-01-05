var expect = require('expect.js')
, Blackjack = require('../../../lib/server/controllers/BjMachine')
, BlackjackModel = require('../../../lib/models/BjMachine')

describe('Blackjack', function() {
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
        })
    })

    describe('eject', function() {
        it('clears player', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            model.get('boxes')[0].player = {}

            table.eject(0)
            expect(model.get('boxes')[0].player).to.be(null)
        })

        it('throws if box is not occupied', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.eject(0)
            }).to.throwError(/empty/)
        })

        it('throws if box is out of range', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.eject(10)
            }).to.throwError(/exist/)
        })

        it('throws if not in the betting state', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            model.set({ state: 'not betting' })
            model.get('boxes')[0].player = {}

            expect(function() {
                table.eject(0)
            }).to.throwError(/state/)
        })
    })

    describe('sit', function() {
        it('sets player', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            , p = {
                model: {
                    id: '123',
                    get: function() {
                        return 'alice'
                    }
                }
            }

            table.sit(0, p)

            expect(model.get('boxes')[0].player).to.be(p)
        })

        it('throws if box is already occupied', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.get('boxes')[0].player = {}

            expect(function() {
                table.sit(0, {})
            }).to.throwError(/taken/)
        })

        it('throws if user is null', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.sit(0)
            }).to.throwError(/user null/)
        })

        it('throws if box is out of range', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.sit(10, {})
            }).to.throwError(/exist/)
        })

        it('throws error if not in betting state', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            model.set({ state: 'not betting' })
            model.get('boxes')[0].player = {}

            expect(function() {
                table.sit(1, {})
            }).to.throwError(/state/)
        })
    })

    describe('bet', function() {
        it('calls user.wager', function(done) {
            var model = new BlackjackModel({ _id: 'test' })
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

            model.get('boxes')[0].player = p

            table.bet(0, 5e8, function(err) {
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
                done()
            })
        })

        it('fails if there are no boxes to deal to', function(done) {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            table.deal(function(err) {
                expect(err).to.be.ok()
                expect(err.message).to.match(/box/)
                done()
            })
        })

        it('fails if a callback is not passed', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            expect(function() {
                table.deal(null)
            }).to.throwError(/callback/)
        })

        it('shuffles', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            , user = { }
            , box = model.attributes.boxes[0]
            box.player = user
            box.bet = 1e8

            var cards = require('../../../lib/cards')
            , orig = cards.shuffle
            , deck = [1, 2, 3, 4]

            cards.shuffle = function() {
                return deck
            }

            table.deal(function(err) {
                expect(model.attributes.deck).to.eql(deck)
            })
        })

        it('deals to dealer first', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })
            , user = { }
            , box = model.attributes.boxes[0]
            box.player = user
            box.bet = 1e8

            var cards = require('../../../lib/cards')
            , orig = cards.shuffle
            , deck = [1, 2, 3, 4]

            cards.shuffle = function() {
                return deck
            }

            table.deal(function(err) {
                expect(model.attributes.dealer).to.eql([1, 2])
                cards.shuffle = orig
            })
        })

        it('deals to boxes in order', function() {
            var model = new BlackjackModel({ _id: 'test' })
            , table = new Blackjack(model, { callback: function() { } })

            model.attributes.boxes = [{
                player: {},
                bet: 1e8
            }, {
                player: {},
                bet: 1e8
            }]

            var cards = require('../../../lib/cards')
            , orig = cards.shuffle
            , deck = [1, 2, 3, 4, 5, 6]

            cards.shuffle = function() {
                return deck
            }

            table.deal(function(err) {
                expect(model.attributes.boxes[0].hands[0].cards).to.eql([3, 4])
                expect(model.attributes.boxes[1].hands[0].cards).to.eql([5, 6])
                cards.shuffle = orig
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
                    player: {},
                    splits: 0,
                    hands: [{
                        index: 0,
                        bet: 1,
                        cards: [1, 10]
                    }]
                }, {
                    index: 1,
                    bet: 1,
                    player: {},
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
                    player: {},
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
        })
    })
})
