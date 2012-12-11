var Player = require('./Player')
, Backbone = require('backbone')
, User = module.exports = Player.extend({
    urlRoot: 'users',

    defaults: {
        wagered: 0,
        requirement: 0,
        balance: 0,
        log: []
    },

    parse: function(resp, xhr) {
        resp._id = resp._id.toString()
        return Backbone.Model.prototype.parse.apply(this, arguments)
    }
})