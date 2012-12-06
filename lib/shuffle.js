var crypto = require('crypto')
, chancejs = require('chancejs')
, debug = require('debug')('shuffle')
, _ = require('underscore');

function hashString(s) {
    var hash = 0;
    for (i = 0; i < s.length; i++) {
        c = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
        hash = hash & hash;
    }
    return hash;
}

module.exports = function(factors) {
    var hash = crypto.createHash('sha1');

    _.each(factors, function(f) {
        hash.update(f);
    });

    hash = hash.digest('hex')
    hash = hashString(hash);

    var seed = new chancejs.MersenneTwister(hash);
    var random = new chancejs.Random(seed);
    var deck = _.sortBy(_.range(1, 53), function() { return random.get(); });

    return deck;
}