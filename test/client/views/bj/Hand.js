var expect = require('expect.js')
, Hand = require('../../../../lib/client/views/bj/Hand')

describe('Hand', function() {
    describe('constructor', function() {
        it('returns a group', function() {
            var hand = Hand()
            expect(hand.nodeType).to.eql('Group')
        })
    })
})
