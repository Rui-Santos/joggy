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
            stage: null,
            boxes: _.map(_.range(5), function(i) {
                return {
                    index: i,
                    player: null
                }
            })
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
