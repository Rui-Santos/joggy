var Backbone = require('backbone')
, Jackpot = module.exports = Backbone.Model.extend({
    idAttribute: '_id',
    urlRoot: 'jackpots'
});