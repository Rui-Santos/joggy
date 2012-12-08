var _ = require('underscore')
, Backbone = require('backbone')
, Card = require('./Card')
, Cards = require('./Cards')
, Machine = module.exports = Backbone.Model.extend({
    idAttribute: '_id',
    urlRoot: 'machines',
    defaults: function() {
        return {
            state: null,
            players: new Backbone.Collection(),
            contributions: {},
        };
    }
})