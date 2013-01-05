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
        'blackjack/:id': 'blackjack',
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
        _gaq.push(['_trackPageview', '#' + Backbone.history.getFragment()])
    },

    redirectToLogin: function() {
        var url = '/authorize/redirect' + (window.location.hash ? '?after=' + window.location.hash.substr(1) : '')
        console.log('redirecting to login (' + url + ')')
        _gaq.push(['_trackEvent', 'Authorization', 'Redirect'])
        window.location = url
    },

    game: function(game, id) {
        if (!this.authorize()) return
        this.track()

        if (id) app.socket.emit('join', { id: id })
        else app.socket.emit('join', { game: game })
    },

    'redWhiteAndBlue': function() {
        this.track()
        this.game('rwb')
    },

    'blackjack': function(id) {
        this.track()
        this.game('bj', id)
    },

    'jacksOrBetter': function() {
        this.track()
        this.game('job')
    }
})