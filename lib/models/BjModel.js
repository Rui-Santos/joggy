var _ = require('underscore')
, Backbone = require('backbone')
, Card = require('./Card')
, Cards = require('./Cards')
, debug = require('debug')('joggy:models:bj-machine')
, Machine = require('./Machine')
, BjMachine = module.exports = Machine.extend({
    idAttribute: '_id',
    urlRoot: 'machines',
    defaults: function() {
        return _.extend(Machine.prototype.defaults.call(this), {
            game: 'bj',
            seats: []
        })
    },

    parse: function(resp, xhr) {
        if (!resp) return
        if (resp.deck) resp.deck = new Cards(resp.deck, { parse: true })
        return resp
    },

    toJSON: function() {
        var result = Backbone.Model.prototype.toJSON.call(this);
        result.deck = result.deck ? result.deck.toJSON() : null;
        return result;
    }
})
