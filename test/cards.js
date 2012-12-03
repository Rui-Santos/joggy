var cards = require('../lib/cards')
, expect = require('expect.js');

describe('cards', function() {
    describe('deck', function() {
        it('should have integer 52 cards', function() {
            var deck = cards.deck();
            expect(deck).to.be.an('array');
            expect(deck.length).to.be(52);
            expect(deck[0]).to.be.a('number');
        });

        it('should be shuffled', function() {
            var deck1 = cards.deck();
            var deck2 = cards.deck();
            expect(deck1).to.not.be(deck2);
        });
    });

    describe('decks', function() {
        var decks = cards.decks(3);
        expect(decks.length).to.be(52 * 3);
    });

    describe('rank', function() {
        it('should wrap on 14', function() {
            expect(cards.rank(1)).to.be(1);
            expect(cards.rank(13 * 1 + 1)).to.be(1);
            expect(cards.rank(13 * 2 + 5)).to.be(5);
        });
    });

    describe('suit', function() {
        it('should be in bridge order', function() {
            expect(cards.suit(13 * 0 + 1)).to.be(0);
            expect(cards.suit(13 * 1 + 5)).to.be(1);
            expect(cards.suit(13 * 2 + 10)).to.be(2);
            expect(cards.suit(52)).to.be(3);
        });
    });

    describe('parse', function() {
        it('should understand normal notation', function() {
            var card = cards.card('as');
            expect(card).to.be(13 * 0 + 13);

            card = cards.card('KH');
            expect(card).to.be(13 * 1 + 12);

            card = cards.card('ah');
            expect(card).to.be(13 * 1 + 13);

            card = cards.card('td');
            expect(card).to.be(13 * 2 + 9);
        });
    });
});