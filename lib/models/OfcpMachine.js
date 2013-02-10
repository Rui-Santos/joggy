var _ = require('underscore')
, Backbone = require('backbone')
, Card = require('./Card')
, Cards = require('./Cards')
, debug = require('debug')('joggy:models:bj-machine')
, Machine = require('./Machine')
, OfcpMachine = module.exports = Machine.extend({
    idAttribute: '_id',
    urlRoot: 'machines',
    defaults: function() {
        return _.extend(Machine.prototype.defaults.call(this), {
            game: 'ofcp'
        })
    },

    parse: function(resp, xhr) {
        if (!resp) return
        return resp
    },

    toJSON: function() {
        var result = Backbone.Model.prototype.toJSON.call(this);
        return result;
    }
})