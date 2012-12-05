var config = require('../../config')
, monk = require('monk')
, db = monk(config.db)
, _ = require('underscore')
, jackpots = db.get('jackpots')
, debug = require('debug')('app:db')
, util = require('util')
, users = db.get('users');

module.exports = db;

_.extend(users, {
    take: function(userId, amount, callback) {
        if (!userId) return callback(new Error('userId missing'))
        users.update({
            _id: userId,
            balance: { $gte: amount }
        }, {
            $inc: { balance: -amount }
        }, function(err, updates) {
            if (err) console.error(err)
            callback && callback(err ? err : updates ? null : new Error('failed to take amount'));
        });
    },

    give: function(userId, amount, callback) {
        debug('giving ' + amount + ' to user ' + userId);

        users.update({
            _id: userId
        }, {
            $inc: { balance: amount }
        }, function(err, updates) {
            if (err) callback(err);
            if  (!updates) callback(new Error('user not found'));
            callback();
        });
    }
})

_.extend(jackpots, {
    pay: function(jackpotId, userId, seed, callback) {
        debug('paying the jackpot ' + jackpotId + ' to user ' + userId);

        var q = { _id: jackpotId };
        var u = { $set: { current: seed } };

        jackpots.findAndModify(q, u, function(err, jackpot) {
            if (err) return callback(err);
            if  (!jackpot) return callback(new Error('jackpot ' + jackpotId + ' not found'));
            debug('jackpot has been reduced to the seed of ' + seed);
            debug('the jackpot was ' + jackpot.current + '. giving to the user');

            users.give(userId, jackpot.current, function(err) {
                callback(err, err ? null : jackpot.current);
            });
        });
    },

    contribute: function(jackpotId, amount, callback) {
        debug('updating jackpot ' + jackpotId + ' with a contribution of ' + amount);

        jackpots.update({
            _id: jackpotId
        }, {
            $inc: { current: amount }
        }, function(err, success) {
            if (!callback) return err || !success ? console.error('uncaught contribute error', err, success) : null;
            if (err) return callback(err);
            if (!success) return callback(new Error('jackpot not found'));
            debug('jackpot contribution successful');
            callback();
        });
    }
});