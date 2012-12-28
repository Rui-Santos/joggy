var expect = require('expect.js')
_ = require('underscore')
, cards = require('../lib/cards')
, vpjob = require('../lib/vp-job');

describe('vp-job', function() {
    describe('ranks', function() {
        expect(vpjob.ranks).to.be.an('array');
        expect(vpjob.ranks[0]).to.be('jacks or better');
        expect(vpjob.ranks[1]).to.be('two pair');
        expect(vpjob.ranks[2]).to.be('three of a kind');
        expect(vpjob.ranks[3]).to.be('straight');
        expect(vpjob.ranks[4]).to.be('flush');
        expect(vpjob.ranks[5]).to.be('full house');
        expect(vpjob.ranks[6]).to.be('four of a kind');
        expect(vpjob.ranks[7]).to.be('straight flush');
        expect(vpjob.ranks[8]).to.be('royal flush');
    });

    describe('rank', function() {
        it('conforms with examples', function() {
            var examples = {
                'as ad ac ah th': 'four of a kind',
                'as ah ac ad 9d': 'four of a kind',
                '8d 4h qd 4s 2h': null,
                '8d 8h 4c 5d 9s': null,
                '9d 4s jh 9c 9s': 'three of a kind',
                '2s 4d jh 8c js': 'jacks or better',
                'kh qd jh qh 9c': 'jacks or better',
                'qd kh ad 8s ac': 'jacks or better',
                '7d jh 7h qh 7s': 'three of a kind',
                '8h qd 8c 9d qs': 'two pair',
                'qd qh qs 7d 7s': 'full house',
                '8h qh 2h 4h 9d': null,
                '8h qh 2h 4h 9h': 'flush',
                'ad 2h 3h 4h 5h': 'straight',
                'ad 2h 3h 4h 5h': 'straight',
                '2h 3h 4h 5h 6h': 'straight flush',
                '2h 2c 2s qd qc': 'full house',
                'ad kd qd jd td': 'royal flush',
                '9d td jd qd kd': 'straight flush',
                'td th tc ts 2d': 'four of a kind',
                'qd kh ad 2s 3c': null,
                'ah ad 9s 9d 8h': 'two pair',
                'jh jd 2s 3d 2d': 'two pair',
                'qs qd 2s 2h qh': 'full house',
                'ad kh qd jc th': 'straight',
                '9d 8d 7d 6d 4d': 'flush',
                'td th 2s 3d 4h': null
            };

            _.each(examples, function(expected, hand) {
                var actual = vpjob.rank(cards.parse(hand));

                if (actual == null) {
                    expect(expected).to.eql(null);
                } else {
                    expect(vpjob.ranks[actual]).to.eql(expected);
                }
            });
        });
    });

    describe('payout 9-6', function() {
        it('conforms to rules', function() {
            expect(vpjob.payout('as ks qs js ts', '9-6', 5)).to.be(4000);
            expect(vpjob.payout('7c 7d kh qh jh', '9-6', 2)).to.be(0);
            expect(vpjob.payout('7c 7d 7h qh jh', '9-6', 4)).to.be(12);
            expect(vpjob.payout('9h 7h 8h 2h qh', '9-6', 5)).to.be(30);
            expect(vpjob.payout('ah kh qh jh th', '9-6', 1)).to.be(800);
        });
    });

    describe('payouts', function() {
        it('exists', function() {
            expect(vpjob.payout).to.be.ok();
        });

        it('is correct for 9-6', function() {
            var pay = vpjob.payouts['9-6'];
            expect(pay).to.be.an('object');
            expect(pay[1]).to.be.an('array');

            // http://en.wikipedia.org/wiki/Video_poker#Jacks_or_Better
            expect(pay[1]).to.eql([1, 2, 3, 4, 6, 9, 25, 50, 800]);
            expect(pay[2]).to.eql([2, 4, 6, 8, 12, 18, 50, 100, 1600]);
            expect(pay[3]).to.eql([3, 6, 9, 12, 18, 27, 75, 150, 2400]);
            expect(pay[4]).to.eql([4, 8, 12, 16, 24, 36, 100, 200, 3200]);
            expect(pay[5]).to.eql([5, 10, 15, 20, 30, 45, 125, 250, 4000]);
        });
    });
});