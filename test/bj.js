var expect = require('expect.js')
, bj = require('../lib/bj')

describe('bj', function() {
    describe('ranks', function() {
        it('is from a to k', function() {
            expect(bj.ranks[0]).to.be('a')
            expect(bj.ranks[12]).to.be('k')
        })
    })

    describe('suits', function() {
        it('is in bridge order', function() {
            expect(bj.suits).to.eql(['s', 'h', 'd', 'c'])
        })
    })

    describe('isBust', function() {
        it('conforms with examples', function() {
            expect(bj.isBust([10, 10, 2])).to.be(true)
            expect(bj.isBust([1])).to.be(false)
            expect(bj.isBust([])).to.be(false)
            expect(bj.isBust([1, 10])).to.be(false)
            expect(bj.isBust([10, 10, 6])).to.be(true)
        })
    })

    describe('sum', function() {
        it('conforms with examples', function() {
            expect(bj.sum([1, 2, 3])).to.be(6)
            expect(bj.sum([1, 10])).to.be(11)
            expect(bj.sum([])).to.be(0)
            expect(bj.sum([5, 5, 5, 5])).to.be(20)
        })
    })

    describe('score', function() {
        it('conforms with examples', function() {
            expect(bj.score([1, 2, 3])).to.be(16)
            expect(bj.score([1, 1, 1])).to.be(13)
            expect(bj.score([1, 10])).to.be(21)
            expect(bj.score([])).to.be(0)
            expect(bj.score([5, 5, 5, 5])).to.be(20)
        })
    })

    describe('value', function() {
        it('conforms with examples', function() {
            expect(bj.value(1)).to.be(1)
            expect(bj.value(11)).to.be(10)
            expect(bj.value(13)).to.be(10)
        })
    })

    describe('pretty', function() {
        it('works for single value', function() {
            expect(bj.pretty(1)).to.be('as')
            expect(bj.pretty(2)).to.be('2s')
        })

        it('works with array', function() {
            expect(bj.pretty([1, 2])).to.be('3/13')
            expect(bj.pretty([1, 10])).to.be('11/21')
        })
    })

    describe('isSoft', function() {
        it('works', function() {
            expect(bj.isSoft([1, 10])).to.be(true)
            expect(bj.isSoft([1, 10, 2])).to.be(false)
        })
    })

    describe('hasAce', function() {
        it('works', function() {
            expect(bj.hasAce([14, 1])).to.be(true)
            expect(bj.hasAce([14, 2])).to.be(true)
            expect(bj.hasAce([5, 2])).to.be(false)
        })
    })

    describe('settle', function() {
        it('pushes natural bjs', function() {
            expect(bj.settle(0, [1, 10], [1, 10], true)).to.be(1)
        })

        it('loses split 21 vs dealer bj', function() {
            expect(bj.settle(1, [1, 10], [1, 10], true)).to.be(0)
        })

        it('returns 2.5x on bj', function() {
            expect(bj.settle(0, [1, 10], [1, 5], false)).to.be(2.5)
        })

        it('wins 1 on post-split 21', function() {
            expect(bj.settle(1, [1, 10], [10, 10], true)).to.be(2)
        })

        it('pushes 1x on post-split 21 vs dealer 21', function() {
            expect(bj.settle(1, [1, 10], [10, 10, 1], true)).to.be(1)
        })

        it('loses if bust', function() {
            expect(bj.settle(1, [10, 6, 12], [], false)).to.be(0)
        })

        it('cannot settle unless dealer stands', function() {
            expect(bj.settle(1, [5, 15], [1, 2, 3, 4, 5], false)).to.be(null)
        })
    })
})
