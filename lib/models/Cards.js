var Backbone = require('backbone')
, Card = require('./Card')
, cards = require('../cards')
, _ = require('underscore');

var Cards = module.exports = _.extend(Backbone.Collection.extend({
    model: Card,
    plain: function() {
        return this.map(function(card) { return card.get('value') });
    },
    pretty: function() {
        return this.length ? cards.pretty(this.plain()) : '(empty)';
    }
}));