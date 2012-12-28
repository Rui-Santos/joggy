var _ = require('underscore')
, chance = require('chancejs')
, cards = module.exports = {
    suits: ['s', 'h', 'd', 'c'],
    ranks: ['2', '3', '4', '5', '6', '7', '8', '9', 't', 'j', 'q', 'k', 'a'],
    rank: function(card) { return ((card - 1) % 13) + 1; },
    suit: function(card) { return Math.floor((card - 1) / 13); },
    parse: function(str) {
        return _.map(str.split(/\s/), function(card) { return cards.card(card); });
    },
    card: function(str) {
        if (str.length != 2) throw new Error('invalid card "' + str + '"');
        var card = str.toLowerCase();
        var rank = cards.ranks.indexOf(card[0]) + 1;
        if (!rank) throw new Error('invalid rank in ' + str);
        var suit = cards.suits.indexOf(card[1]);
        if (!~suit) throw new Error('invalid suit in ' + str);
        return suit * 13 + rank;
    },
    pretty: function(value) {
        if (_.isArray(value)) return _.map(value, cards.pretty).join(' ');
        return cards.ranks[(value - 1) % 13] + cards.suits[Math.floor((value - 1) / 13)];
    },
    deck: function() {
        var newDeck = [];

        for( var i in this.suits ) {
            for( var ii in this.ranks ) {
                newDeck.push((13 * i) * (ii));
            }
        }

        return newDeck;
    },
    decks: function(num) {
        var num = num || 0,
            decks = [],
            deck = this.deck();

        for( var i=0; i < num; i++ ) {
            decks = decks.concat( deck );
        }

        return decks;
    }
};