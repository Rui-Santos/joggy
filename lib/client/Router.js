var Backbone = require('backbone')
_ = require('underscore')
, Models = require('../models')
, Views = require('./views')
, app = require('./app')
, Router = module.exports = Backbone.Router.extend({
    initialize: function() {
    },

    home: function() {
    },

    routes: {
        '': 'home'
    }
});