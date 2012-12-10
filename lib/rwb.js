var rwb = module.exports = {
    symbols: {
        'blank': -1,
        'red seven': 0,
        'white seven': 1,
        'blue seven': 2,
        'one bar': 3,
        'two bar': 4,
        'three bar': 5
    },

    lookups: [
        [0,0,0,0.5,0.5,1,1,1.5,1.5,1.5,2,2,2,2,2,2,2.5,2.5,2.5,3,3,3,3.5,3.5,3.5,4,4,4,4,4,4,4.5,4.5,4.5,5,5,5.5,5.5,6,6.5,6.5,6.5,6.5,6.5,7,7.5,7.5,7.5,7.5,7.5,8,8,8,8.5,8.5,9,9,9.5,9.5,10,10,10,10.5,10.5],
        [0,0,0.5,0.5,1,1,1.5,1.5,1.5,2,2.5,2.5,2.5,3,3,3,3,3.5,3.5,3.5,4,4,4,4,4,4,4,4.5,4.5,4.5,5,5,5.5,5.5,6,6,6.5,6.5,6.5,6.5,6.5,7,7,7,7.5,7.5,7.5,7.5,7.5,8,8,8,8.5,8.5,9,9,9.5,9.5,10,10,10,10,10.5,10.5],
        [0,0,0,0.5,0.5,1,1.5,1.5,1.5,2,2,2,2,2,2,2,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,4,4.5,4.5,4.5,5,5,5,5.5,5.5,6,6.5,6.5,6.5,6.5,6.5,7,7.5,7.5,7.5,7.5,7.5,8,8,8,8.5,8.5,9,9,9,9.5,9.5,10,10,10,10,10.5,10.5]
    ],

    reels: [
        [4, 5, 1, 3, 2, 4, 5, 0, 5, 4, 3],
        [4, 5, 1, 3, 2, 4, 5, 0, 5, 4, 3],
        [4, 5, 1, 3, 2, 4, 5, 0, 5, 4, 3],
    ],

    lookup: function(reel, stop) {
        var value = rwb.lookups[reel][stop]
        return value % 1 === 0.5 ? -1 : rwb.reels[reel][value]
    },

    classicPayouts: {
        0: [0, 0, 0],
        1: [2400, 4800, 10000],
        2: [1199, 2400, 5000],
        3: [200, 400, 600],
        4: [150, 300, 450],
        5: [80, 160, 240],
        6: [50, 100, 150],
        7: [40, 80, 120],
        8: [25, 50, 75],
        9: [20, 40, 60],
        10: [10, 20, 30],
        11: [5, 10, 15],
        12: [2, 4, 6],
        13: [2, 4, 6],
        14: [2, 4, 6],
        15: [1, 2, 3]
    },

    nicePayouts: {
        0: [0, 0, 0],
        1: [3000 * 1, 3000 * 2, 3000 * 3],
        2: [2150 * 1, 2150 * 2, 2150 * 3],
        3: [300 * 1, 300 * 2, 300 * 3],
        4: [125 * 1, 125 * 2, 125 * 3],
        5: [100 * 1, 100 * 2, 100 * 3],
        6: [55 * 1, 55 * 2, 55 * 3],
        7: [45 * 1, 45 * 2, 45 * 3],
        8: [20 * 1, 20 * 2, 20 * 3],
        9: [15 * 1, 15 * 2, 15 * 3],
        10: [10 * 1, 10 * 2, 10 * 3],
        11: [5 * 1, 5 * 2, 5 * 3],
        12: [2 * 1, 2 * 2, 2 * 3],
        13: [2 * 1, 2 * 2, 2 * 3],
        14: [2 * 1, 2 * 2, 2 * 3],
        15: [1 * 1, 1 * 2, 1 * 3]
    },

    payout: function(line, coins, table) {
        if (!coins) throw new Error('coins missing')
        if (!table) throw new Error('table missing')
        var rank = rwb.rank(line)
        return rwb[table + 'Payouts'][rank][coins - 1]
    },

    rank: function(line) {
        if (line.length !== rwb.reels.length) throw new Error('bad line length')
        for (var r = 0; r < line.length; r++) {
            if (typeof line[r] !== 'number') throw new Error('bad symbol (not number) in reel index ' + r + '(' + line[r] + ')')
            if (!~[-1, 0, 1, 2, 3, 4, 5].indexOf(line[r])) throw new Error('bad symbol index in reel index ' + r)
        }

        // Red 7, white 7, blue 7
        // 10000
        if (line[0] === rwb.symbols['red seven'] &&
            line[1] === rwb.symbols['white seven'] &&
            line[2] === rwb.symbols['blue seven']) {
            return 1
        }

        // Red 7, red 7, red 7
        // 5000
        if (line[0] === rwb.symbols['red seven'] &&
            line[1] === rwb.symbols['red seven'] &&
            line[2] === rwb.symbols['red seven']) {
            return 2
        }

        // White 7, white 7, white 7
        // 600
        if (line[0] === rwb.symbols['white seven'] &&
            line[1] === rwb.symbols['white seven'] &&
            line[2] === rwb.symbols['white seven']) {
            return 3
        }

        // Blue 7, blue 7, blue 7
        // 450
        if (line[0] === rwb.symbols['blue seven'] &&
            line[1] === rwb.symbols['blue seven'] &&
            line[2] === rwb.symbols['blue seven']) {
            return 4
        }

        function isSeven(symbol) {
            return symbol === rwb.symbols['red seven'] ||
                symbol === rwb.symbols['white seven'] ||
                symbol === rwb.symbols['blue seven']
        }

        // Any 3 sevens
        // 240
        if (isSeven(line[0]) && isSeven(line[1]) && isSeven(line[2])) {
            return 5
        }

        // 1 bar, 2 bar, 3 bar
        // 150
        if (line[0] === rwb.symbols['one bar'] &&
            line[1] === rwb.symbols['two bar'] &&
            line[2] === rwb.symbols['three bar']) {
            return 6
        }

        // 3 bar, 3 bar, 3 bar
        // 120
        if (line[0] === rwb.symbols['three bar'] &&
            line[1] === rwb.symbols['three bar'] &&
            line[2] === rwb.symbols['three bar']) {
            return 7
        }

        // 2 bar, 2 bar, 2 bar
        // 75
        if (line[0] === rwb.symbols['two bar'] &&
            line[1] === rwb.symbols['two bar'] &&
            line[2] === rwb.symbols['two bar']) {
            return 8
        }

        function isRed(symbol) {
            return symbol === rwb.symbols['red seven'] || symbol === rwb.symbols['one bar']
        }

        function isWhite(symbol) {
            return symbol === rwb.symbols['white seven'] || symbol === rwb.symbols['two bar']
        }

        function isBlue(symbol) {
            return symbol === rwb.symbols['blue seven'] || symbol === rwb.symbols['three bar']
        }

        // Any red, any white, any blue
        // 60
        if (isRed(line[0]) && isWhite(line[1]) && isBlue(line[2])) {
            return 9
        }

        // 1 bar, 1 bar, 1 bar
        // 30
        if (line[0] === rwb.symbols['one bar'] &&
            line[1] === rwb.symbols['one bar'] &&
            line[2] === rwb.symbols['one bar']) {
            return 10
        }

        function isBar(symbol) {
            return symbol === rwb.symbols['one bar'] ||
                symbol === rwb.symbols['two bar'] ||
                symbol === rwb.symbols['three bar']
        }

        // Any 3 bars
        // 15
        if (isBar(line[0]) && isBar(line[1]) && isBar(line[2])) {
            return 11
        }

        // Any 3 reds
        // 6
        if (isRed(line[0]) && isRed(line[1]) && isRed(line[2])) {
            return 12
        }

        // Any 3 white
        // 6
        if (isWhite(line[0]) && isWhite(line[1]) && isWhite(line[2])) {
            return 13
        }

        // Any 3 blues
        // 6
        if (isBlue(line[0]) && isBlue(line[1]) && isBlue(line[2])) {
            return 14
        }

        // Blank, blank, blank
        // 3
        if (line[0] === -1 &&
            line[1] === -1 &&
            line[2] === -1) {
            return 15
        }

        return 0
    }
}