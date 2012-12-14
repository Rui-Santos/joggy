var Backbone = require('backbone')
_ = require('underscore')
, Models = require('../models')
, Views = require('./views')
, app = require('./app')
, Router = module.exports = Backbone.Router.extend({
    initialize: function() {
    },

    routes: {
        '': 'home',
        'red-white-and-blue': 'redWhiteAndBlue',
        'jacks-or-better': 'jacksOrBetter'
    },

    home: function() {
        app.view = new Views.AppView()
        app.view.primary(new Views.WelcomeView())
    },

    authorize: function() {
        if (!app.user) {
            window.location = '/authorize/redirect'
            return false
        }

        return true
    },

    game: function(game) {
        if (!this.authorize()) return
        app.socket.emit('join', { game: game })
    },

    'redWhiteAndBlue': function() {
        this.game('rwb')
    },

    'jacksOrBetter': function() {
        this.game('job')
    }
})