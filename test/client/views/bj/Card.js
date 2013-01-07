var Card = require('../../../../lib/client/views/bj/Card')

describe('Card', function() {
    describe('constructor', function() {
        it('has default width 100px', function() {
            var card = Card({
                cards: new Image(),
            }, 1)

            expect(card.getWidth()).to.be(100)
        })
    })

    describe('discard', function() {
        it('runs callback', function(done) {
            this.timeout(2000)

            var card = Card({
                cards: new Image(),
            }, 1)

            var layer = new Kinetic.Layer()
            layer.add(card)

            card.discard(done)
        })
    })
})
