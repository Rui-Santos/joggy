var _ = require('underscore')
, Backbone = require('backbone')
, Player = module.exports = Backbone.Model.extend({
    idAttribute: '_id',
    defaults: function() {
        return {
            balance: null,
            name: null
        };
    },
    profile: function() {
        return _.pick(this.toJSON(), '_id', 'name');
    }
});