var expect = require('expect.js')
, Cards = require('../../../../lib/client/views/bj/Cards')

describe('Cards', function() {
    describe('constructor', function() {
        it('returns a group', function() {
            var cards = Cards()
            expect(cards.nodeType).to.eql('Group')
        })
    })

    describe('addCard', function() {
    })
})
