require('crypto-browserify')
var Backbone = require('backbone')
, Router = require('./Router')
, Models = require('../models')
, Views = require('./views')
_ = require('underscore')

Backbone.setDomLibrary(jQuery)

var app = require('./app')

function enableSocketDebugging() {
    app.socket.emit = _.wrap(app.socket.emit, function(fn, name) {
        console.log('-->', name, JSON.stringify(_.toArray(arguments).slice(2)))
        fn.apply(app.socket, _.toArray(arguments).slice(1))
    })

    app.socket.$emit = _.wrap(app.socket.$emit, function(fn) {
        console.log('<--', arguments[1], JSON.stringify(_.toArray(arguments).slice(2)))
        return fn.apply(app.socket, _.toArray(arguments).slice(1))
    })
}

function socketConnect() {
    console.log('socket connected')
}

function socketConnectFailed() {
    alertify.error('cant seem to connect to the backend. refreshing')

    setTimeout(function() {
        window.location = window.location
    }, 2000)
}

function socketError(error) {
    if (error === 'handshake unauthorized') {
        alertify.error('backend seems to have upgraded. refreshing')

        return setTimeout(function() {
            if (app.user) {
                window.location = '/authorize/redirect'
                return
            }

            window.location = window.location
        }, 2000)
    }

    if (error && error.message) {
        alertify.error(error.message)
    }

    console.log('socket error', error)
}

function socketUser(user) {
    if (app.user) {
        app.user.set(user, { parse: true })
    } else {
        app.user = new Models.User(user, { parse: true })
    }

    app.view.topBar.render()
}

function socketJoin(message) {
    var model = new Models.Machine(message, { parse: true })

    app.view.primary(new Views.MachineView({
        model: model
    }))
}

function socketBalance(message) {
    app.user.set('balance', message.balance)
}

$(function() {
    console.log('creating and connecting socket')

    app.socket = io.connect()
    enableSocketDebugging()
    app.socket.on('connect', socketConnect)
    app.socket.on('connect_failed', socketConnectFailed)
    app.socket.on('error', socketError)
    app.socket.on('user', socketUser)
    app.socket.on('balance', socketBalance)
    app.socket.on('join', socketJoin)

    app.preloader = new (require('./preload'))()
    app.view = new Views.AppView()
    app.view.primary(new Views.WelcomeView())
    app.router = new Router()

    Backbone.history.start()
})