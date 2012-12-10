var expect = require('expect.js')
, rwb = require('../lib/rwb')

describe('rwb', function() {
    describe('payout', function() {
        it('conforms with known examples', function() {
            expect(rwb.payout([
                rwb.symbols['red seven'],
                rwb.symbols['white seven'],
                rwb.symbols['blue seven']
            ], 3, 'classic')).to.be(10000)

            expect(rwb.payout([
                rwb.symbols['red seven'],
                rwb.symbols['red seven'],
                rwb.symbols['red seven']
            ], 3, 'classic')).to.be(5000)

            expect(rwb.payout([
                rwb.symbols['white seven'],
                rwb.symbols['white seven'],
                rwb.symbols['white seven']
            ], 3, 'classic')).to.be(600)

            expect(rwb.payout([
                rwb.symbols['blue seven'],
                rwb.symbols['blue seven'],
                rwb.symbols['blue seven']
            ], 3, 'classic')).to.be(450)

            expect(rwb.payout([
                rwb.symbols['white seven'],
                rwb.symbols['red seven'],
                rwb.symbols['blue seven']
            ], 3, 'classic')).to.be(240)

            expect(rwb.payout([
                rwb.symbols['white seven'],
                rwb.symbols['red seven'],
                rwb.symbols['red seven']
            ], 3, 'classic')).to.be(240)

            expect(rwb.payout([
                rwb.symbols['blue seven'],
                rwb.symbols['white seven'],
                rwb.symbols['red seven']
            ], 3, 'classic')).to.be(240)

            expect(rwb.payout([
                rwb.symbols['one bar'],
                rwb.symbols['two bar'],
                rwb.symbols['three bar']
            ], 3, 'classic')).to.be(150)

            expect(rwb.payout([
                rwb.symbols['three bar'],
                rwb.symbols['three bar'],
                rwb.symbols['three bar']
            ], 3, 'classic')).to.be(120)

            expect(rwb.payout([
                rwb.symbols['two bar'],
                rwb.symbols['two bar'],
                rwb.symbols['two bar']
            ], 3, 'classic')).to.be(75)

            expect(rwb.payout([
                rwb.symbols['one bar'], // red
                rwb.symbols['two bar'], // white
                rwb.symbols['blue seven']
            ], 3, 'classic')).to.be(60)

            expect(rwb.payout([
                rwb.symbols['red seven'],
                rwb.symbols['white seven'],
                rwb.symbols['three bar']
            ], 3, 'classic')).to.be(60)

            expect(rwb.payout([
                rwb.symbols['one bar'],
                rwb.symbols['one bar'],
                rwb.symbols['one bar']
            ], 3, 'classic')).to.be(30)

            expect(rwb.payout([
                rwb.symbols['three bar'],
                rwb.symbols['three bar'],
                rwb.symbols['two bar']
            ], 3, 'classic')).to.be(15)

            expect(rwb.payout([
                rwb.symbols['three bar'],
                rwb.symbols['one bar'],
                rwb.symbols['one bar']
            ], 3, 'classic')).to.be(15)

            expect(rwb.payout([
                rwb.symbols['one bar'],
                rwb.symbols['three bar'],
                rwb.symbols['two bar']
            ], 3, 'classic')).to.be(15)

            // any 3 red
            expect(rwb.payout([
                rwb.symbols['red seven'],
                rwb.symbols['red seven'],
                rwb.symbols['one bar']
            ], 3, 'classic')).to.be(6)

            expect(rwb.payout([
                rwb.symbols['red seven'],
                rwb.symbols['one bar'],
                rwb.symbols['one bar']
            ], 3, 'classic')).to.be(6)

            // any 3 white
            expect(rwb.payout([
                rwb.symbols['two bar'],
                rwb.symbols['two bar'],
                rwb.symbols['white seven']
            ], 3, 'classic')).to.be(6)

            // any 3 blue
            expect(rwb.payout([
                rwb.symbols['three bar'],
                rwb.symbols['three bar'],
                rwb.symbols['blue seven']
            ], 3, 'classic')).to.be(6)

            expect(rwb.payout([
                rwb.symbols['blank'],
                rwb.symbols['blank'],
                rwb.symbols['blank']
            ], 3, 'classic')).to.be(3)

            // nothing
            expect(rwb.payout([
                rwb.symbols['blank'],
                rwb.symbols['blank'],
                rwb.symbols['red seven']
            ], 3, 'classic')).to.be(0)

            expect(rwb.payout([
                rwb.symbols['red seven'],
                rwb.symbols['blue seven'],
                rwb.symbols['three bar']
            ], 3, 'classic')).to.be(0)

            expect(rwb.payout([
                rwb.symbols['one bar'],
                rwb.symbols['red seven'],
                rwb.symbols['blue seven']
            ], 3, 'classic')).to.be(0)
        })
    })

    describe('rank', function() {
        it('has the correct distribution', function() {
            var expectedDist = [
                216672,
                1,
                3,
                42,
                42,
                1199,
                180,
                210,
                378,
                113,
                432,
                7977,
                335,
                1036,
                756,
                32768
            ]

            for (var i = 14; i >= 0; i--) {
                var outcomes = 0

                for (var r1 = 0; r1 < 64; r1++) {
                    for (var r2 = 0; r2 < 64; r2++) {
                        for (var r3 = 0; r3 < 64; r3++) {
                            var rank = rwb.rank([
                                rwb.lookup(0, r1),
                                rwb.lookup(1, r2),
                                rwb.lookup(2, r3)
                            ])

                            if (rank === i) {
                                outcomes++
                            }
                        }
                    }
                }

                expect(outcomes).to.be(expectedDist[i])
            }
        })
    })

    describe('lookups', function() {
        it('is always sixty four (stops)', function() {
            expect(rwb.lookups[0].length === 64)
            expect(rwb.lookups[1].length === 64)
            expect(rwb.lookups[2].length === 64)
        })
    })

    describe('lookup', function() {
        it('returns expected values', function() {
            // http://wizardofodds.com/games/slots/appendix/6/
            var stops = [
                '1,2 bar,2 bar,2 bar',
                '2,2 bar,2 bar,2 bar',
                '3,2 bar,blank,2 bar',
                '4,blank,blank,blank',
                '5,blank,3 bar,blank',
                '6,3 bar,3 bar,3 bar',
                '7,3 bar,blank,blank',
                '8,blank,blank,blank',
                '9,blank,blank,blank',
                '10,blank,white 7,white 7',
                '11,white 7,blank,white 7',
                '12,white 7,blank,white 7',
                '13,white 7,blank,white 7',
                '14,white 7,1 bar,white 7',
                '15,white 7,1 bar,white 7',
                '16,white 7,1 bar,white 7',
                '17,blank,1 bar,blank',
                '18,blank,blank,blank',
                '19,blank,blank,blank',
                '20,1 bar,blank,1 bar',
                '21,1 bar,blue 7,1 bar',
                '22,1 bar,blue 7,1 bar',
                '23,blank,blue 7,1 bar',
                '24,blank,blue 7,1 bar',
                '25,blank,blue 7,blank',
                '26,blue 7,blue 7,blank',
                '27,blue 7,blue 7,blank',
                '28,blue 7,blank,blue 7',
                '29,blue 7,blank,blank',
                '30,blue 7,blank,blank',
                '31,blue 7,2 bar,blank',
                '32,blank,2 bar,2 bar',
                '33,blank,blank,2 bar',
                '34,blank,blank,2 bar',
                '35,2 bar,3 bar,blank',
                '36,2 bar,3 bar,blank',
                '37,blank,blank,3 bar',
                '38,blank,blank,blank',
                '39,3 bar,blank,blank',
                '40,blank,blank,blank',
                '41,blank,blank,blank',
                '42,blank,red 7,blank',
                '43,blank,red 7,red 7',
                '44,blank,red 7,blank',
                '45,red 7,blank,blank',
                '46,blank,blank,blank',
                '47,blank,blank,blank',
                '48,blank,blank,blank',
                '49,blank,blank,3 bar',
                '50,blank,3 bar,3 bar',
                '51,3 bar,3 bar,3 bar',
                '52,3 bar,3 bar,blank',
                '53,3 bar,blank,blank',
                '54,blank,blank,2 bar',
                '55,blank,2 bar,2 bar',
                '56,2 bar,2 bar,2 bar',
                '57,2 bar,blank,blank',
                '58,blank,blank,blank',
                '59,blank,1 bar,1 bar',
                '60,1 bar,1 bar,1 bar',
                '61,1 bar,1 bar,1 bar',
                '62,1 bar,1 bar,1 bar',
                '63,blank,blank,blank',
                '64,blank,blank,blank'
            ]

            function translate(x) {
                if (x === '1 bar') return 'one bar'
                if (x === '2 bar') return 'two bar'
                if (x === '3 bar') return 'three bar'
                if (x === 'red 7') return 'red seven'
                if (x === 'white 7') return 'white seven'
                if (x === 'blue 7') return 'blue seven'
                if (x === 'blank') return x
                throw new Error(x)
            }

            for (var s = 0; s < stops.length; s++) {
                var theirs = stops[s].split(',').slice(1).map(function(x) {
                    return rwb.symbols[translate(x)]
                })

                for (var r = 0; r < 3; r++) {
                    var their = theirs[r]
                    , our = rwb.lookup(r, s)

                    expect(our).to.be(their)
                }
            }
        })
    })

    describe('nicePayouts', function() {
        var expectedReturns = [
            0.98, // 1
            0.98, // 2
            0.98 // 3
        ]

        for (var c = 1; c <= 3; c++) {
            var returned = 0

            for (var r1 = 0; r1 < rwb.lookups[0].length; r1++) {
                for (var r2 = 0; r2 < rwb.lookups[1].length; r2++) {
                    for (var r3 = 0; r3 < rwb.lookups[2].length; r3++) {
                        var line = [
                            rwb.lookup(0, r1),
                            rwb.lookup(1, r2),
                            rwb.lookup(2, r3)
                        ]

                        returned += rwb.payout(line, c, 'nice')
                    }
                }
            }

            var returnedAvg = returned / 64 / 64 / 64
            , returnedPerCoin = returnedAvg / c
            console.log('returned per coin for ' + c + ' is ' + returnedPerCoin)
            , delta = Math.abs(expectedReturns[c - 1] - returnedPerCoin)
            console.log(expectedReturns[c - 1] - returnedPerCoin)
            expect(delta).to.be.lessThan(0.0005)
        }
    })

    describe('classicPayouts', function() {
        var expectedReturns = [
            0.8658, // 1
            0.8658, // 2
            0.8747 // 3
        ]

        for (var c = 1; c <= 3; c++) {
            var returned = 0

            for (var r1 = 0; r1 < rwb.lookups[0].length; r1++) {
                for (var r2 = 0; r2 < rwb.lookups[1].length; r2++) {
                    for (var r3 = 0; r3 < rwb.lookups[2].length; r3++) {
                        var line = [
                            rwb.lookup(0, r1),
                            rwb.lookup(1, r2),
                            rwb.lookup(2, r3)
                        ]

                        returned += rwb.payout(line, c, 'classic')
                    }
                }
            }

            var returnedAvg = returned / 64 / 64 / 64
            , returnedPerCoin = returnedAvg / c
            , delta = Math.abs(expectedReturns[c - 1] - returnedPerCoin)
            expect(delta).to.be.lessThan(0.0001)
        }
   })
})