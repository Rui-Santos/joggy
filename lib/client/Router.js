var Backbone = require('backbone')
_ = require('underscore')
, Models = require('../models')
, Views = require('./views')
, app = require('./app')
, Router = module.exports = Backbone.Router.extend({
    initialize: function() {
        app.view = new Views.AppView()
    },

    routes: {
        '': 'home',
        'red-white-and-blue': 'redWhiteAndBlue',
        'jacks-or-better': 'jacksOrBetter'
    },

    home: function() {
        this.track('home')
        app.view.primary(new Views.WelcomeView())
    },

    authorize: function() {
        if (!app.user) {
            this.redirectToLogin()
            return false
        }

        return true
    },

    track: function() {
        app.gaq.push(['_trackPageview', '#' + Backbone.history.getFragment()])
    },

    redirectToLogin: function() {
        var url = '/authorize/redirect' + (window.location.hash ? '?after=' + window.location.hash.substr(1) : '')
        console.log('redirecting to login (' + url + ')')
        window.location = url
    },

    game: function(game) {
        if (!this.authorize()) return
        this.track()
        app.socket.emit('join', { game: game })
    },

    'redWhiteAndBlue': function() {
        this.track()
        this.game('rwb')
    },

    'jacksOrBetter': function() {
        this.track()
        this.game('job')
    }
})