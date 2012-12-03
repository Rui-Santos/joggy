var cards = require('./cards')
_ = require('underscore')
, numsort = function(a, b) { return a > b ? 1 : a == b ? 0 : -1 }
, job = module.exports = {
    ranks: [
        'jacks or better',
        'two pair',
        'three of a kind',
        'straight',
        'flush',
        'full house',
        'four of a kind',
        'straight flush',
        'royal flush'
    ],

    flush: function(hand) {
        var suit = cards.suit(hand[0]);
        for (var i = 1; i < hand.length; i++) {
            if (cards.suit(hand[i]) != suit) {
                return false;
            }
        }

        return true;
    },

    sortedRanks: function(hand) {
        return _.chain(hand).map(cards.rank).sort(numsort).value();
    },

    ofAKind: function(hand, n) {
        var sorted = job.sortedRanks(hand);
        var grouped = _.groupBy(sorted, function(x) { return x; });
        return _.any(grouped, function(x) { return x.length >= n });
    },

    twoPair: function(hand) {
        var ranks = job.sortedRanks(hand);
        return _.uniq(ranks).length == 3 && !job.ofAKind(hand, 3);
    },

    jacksOrBetter: function(hand) {
        var ranks = job.sortedRanks(hand);

        for (var i = 1; i < hand.length; i++) {
            if (ranks[i] == ranks[i - 1] && ranks[i] >= 10) {
                return true;
            }
        }

        return false;
    },

    fullHouse: function(hand) {
        var ranks = job.sortedRanks(hand);
        return _.uniq(ranks).length == 2 && !job.ofAKind(hand, 4);
    },

    straight: function(hand) {
        var ranks = job.sortedRanks(hand);

        // 2, 3, 4, 5, a
        if (ranks[0] == 1 && ranks[1] == 2 && ranks[2] == 3 && ranks[3] == 4 && ranks[4] == 13) {
            return true;
        }

        for (var i = 1; i < 5; i++) {
            if (ranks[i] != ranks[i-1] + 1) {
                return false;
            }
        }

        return true;
    },

    payouts: {
        '9-6': {
            1: [1 * 1, 1 * 2, 1 * 3, 1 * 4, 1 * 6, 1 * 9, 1 * 25, 1 * 50, 1 * 800],
            2: [2 * 1, 2 * 2, 2 * 3, 2 * 4, 2 * 6, 2 * 9, 2 * 25, 2 * 50, 2 * 800],
            3: [3 * 1, 3 * 2, 3 * 3, 3 * 4, 3 * 6, 3 * 9, 3 * 25, 3 * 50, 3 * 800],
            4: [4 * 1, 4 * 2, 4 * 3, 4 * 4, 4 * 6, 4 * 9, 4 * 25, 4 * 50, 4 * 800],
            5: [5 * 1, 5 * 2, 5 * 3, 5 * 4, 5 * 6, 5 * 9, 5 * 25, 5 * 50, 5 * 800]
        }
    },

    contributions: {
        '9-6': 0.0045
    },

    payout: function(hand, table, coins) {
        if (_.isString(hand)) return job.payout(cards.parse(hand), table, coins);
        var rank = job.rank(hand);
        return job.payouts[table][coins][rank] || 0;
    },

    rank: function(hand) {
        if (job.flush(hand)) {
            if (job.straight(hand)) {
                var ranks = job.sortedRanks(hand);

                // jack low
                if (ranks[0] == 9) {
                    return 8;
                }

                return 7;
            }

            return 4;
        }

        if (job.ofAKind(hand, 4)) return 6;
        if (job.fullHouse(hand)) return 5;
        if (job.straight(hand)) return 3;
        if (job.ofAKind(hand, 3)) return 2;
        if (job.twoPair(hand)) return 1;
        if (job.jacksOrBetter(hand)) return 0;
        return null;
    }
};