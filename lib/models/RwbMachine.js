var _ = require('underscore')
, Backbone = require('backbone')
, Machine = require('./Machine')
, RwbMachine = module.exports = Machine.extend({
    idAttribute: '_id',
    urlRoot: 'machines',
    defaults: function() {
        return _.extend(Machine.prototype.defaults.call(this), {
            stops: [0,0, 0],
            bet: 1,
            game: 'rwb'
        })
    }
})