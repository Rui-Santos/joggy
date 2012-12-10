var _ = require('underscore')
, Backbone = require('backbone')
, Card = require('./Card')
, Cards = require('./Cards')
, debug = require('debug')('joggy:models:job-machine')
, Machine = require('./Machine')
, JobMachine = module.exports = Machine.extend({
    idAttribute: '_id',
    urlRoot: 'machines',
    defaults: function() {
        return _.extend(Machine.prototype.defaults.call(this), {
            hand: JobMachine.emptyHand(),
            bet: 1,
            paytable: '9-6',
            jackpot: 'job',
            game: 'job'
        })
    },

    parse: function(resp, xhr) {
        if (!resp) return
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
})

JobMachine.emptyHand = function() {
    return new Cards(_.map(_.range(5), function(index) {
        return new Card();
    }));
}