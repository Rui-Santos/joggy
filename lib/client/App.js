var Backbone = require('backbone')
_ = require('underscore')
, Models = require('../models')
, Views = require('./views')
, Preload = require('./preload')
, App = module.exports = Backbone.Router.extend({
    initialize: function() {
        this.socket = io.connect();

        // debugging
        this.socket.on('reconnect', function() {
            window.location = window.location;
        });

        // debugging messages
        this.socket.emit = _.wrap(this.socket.emit, function(fn, name) {
            console.log('-->', name, _.toArray(arguments).slice(2));
            fn.apply(this, _.toArray(arguments).slice(1));
        });

        this.socket.$emit = _.wrap(this.socket.$emit, function(fn) {
            console.log('<--', arguments[1], _.toArray(arguments).slice(2));
            return fn.apply(this, _.toArray(arguments).slice(1));
        });

        this.socket.on('connect', _.bind(this.onSocketConnect, this));
        this.socket.on('user', _.bind(this.onSocketUser, this));
        this.socket.on('balance', _.bind(this.onSocketBalance, this));

        this.socket.on('error', _.bind(function(reason) {
            if (reason === 'client not handshaken') {
                alertify.error('backend seems to have upgraded. refreshing')

                return setTimeout(function() {
                    window.location = window.location
                }, 2000)
            }

            if (reason && reason.message) {
                alertify.error(reason.message)
            }
        }, this))

        this.socket.on('connect_failed', _.bind(function() {
            alertify.error('cant seem to connect to the backend. refreshing')

            setTimeout(function() {
                window.location = window.location
            }, 2000)
        }, this))

        this.user = null;
        this.preloader = new (require('./preload'))()
    },

    onSocketBalance: function(message) {
        this.user.set('balance', message.balance);
    },

    onSocketUser: function(message) {
        if (!this.user) {
            this.user = new Models.User();
        }

        this.user.set(message, { parse: true });

        this.menu.render();
    },

    onSocketJoin: function(message) {
        var machine = new Models.Machine(message, { parse: true });

        var view = new Views.Machine({
            el: '#machine',
            model: machine,
            app: this
        });

        $('body').append(view.$el);
    },

    onSocketConnect: function() {
        console.log('socket connected');
    },

    home: function() {
        this.socket.on('join', _.bind(this.onSocketJoin, this));

        this.menu = new Views.Menu({
            app: this
        }).render();

        this.chat = new Views.Chat({
            app: this
        }).render();
    },

    routes: {
        '': 'home'
    }
});

Backbone.setDomLibrary(jQuery);