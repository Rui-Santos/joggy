var Player = require('./Player')
, User = module.exports = Player.extend({
    urlRoot: 'users',

    defaults: {
        wagered: 0,
        requirement: 0,
        balance: 0,
        log: []
    }
})