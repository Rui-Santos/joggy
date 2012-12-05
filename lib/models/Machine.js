    var _ = require('underscore')
, Backbone = require('backbone')
, Card = require('./Card')
, Cards = require('./Cards')
, Machine = module.exports = Backbone.Model.extend({
    idAttribute: '_id',
    urlRoot: 'machines',
    defaults: function() {
        return {
            hand: Machine.emptyHand(),
            state: null,
            players: new Backbone.Collection(),
            contributions: {},
            bet: 1,
            jackpot: null
        };
    },
    parse: function(resp, xhr) {
        if (!resp) return
        resp = _.clone(resp)
        if (resp.hand) resp.hand = new Cards(resp.hand, { parse: true })
        if (resp.deck) resp.deck = new Cards(resp.deck, { parse: true })
        return resp
    },

    toJSON: function() {
        var result = Backbone.Model.prototype.toJSON.call(this);
        result.hand = result.hand ? result.hand.toJSON() : null;
        result.deck = result.deck ? result.deck.toJSON() : null;
        return result;
    }
});

Machine.emptyHand = function() {
    return new Cards(_.map(_.range(5), function(index) {
        return new Card();
    }));
}