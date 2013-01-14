require('crypto-browserify')
require('debug').enable('.*')

var Backbone = require('backbone')
, Router = require('./Router')
, Models = require('../models')
, Views = require('./views')
, BjMachineView = require('./views/bj/BjMachineView')
_ = require('underscore')
, debug = require('debug')('joggy:entry')

Backbone.setDomLibrary(jQuery)

var app = require('./app')

function enableSocketDebugging() {
    app.socket.emit = _.wrap(app.socket.emit, function(fn, name) {
        debug('-->', name, _.toArray(arguments).slice(2))
        fn.apply(app.socket, _.toArray(arguments).slice(1))
    })

    app.socket.$emit = _.wrap(app.socket.$emit, function(fn) {
        debug('<--', arguments[1], _.toArray(arguments).slice(2))
        return fn.apply(app.socket, _.toArray(arguments).slice(1))
    })
}

function socketConnect() {
    debug('socket connected')
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
            app.router.redirectToLogin()
        }, 1)
    }

    if (error && error.message) {
        alertify.error(error.message)
    }

    try {
        alertify.error(JSON.stringify(error))
        console.error('socket error')
        console.error(error)
    } catch(e) {
        alertify.error(error)
        console.error(error)
    }
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
    var type

    if (message.game === 'job') type = Views.JobMachineView
    else if (message.game === 'rwb') type = Views.RwbMachineView
    else if (message.game === 'bj') type = BjMachineView
    else throw new Error('machine view type not found for ' + message.game)

    debug('view for machine created. making model')

    var model = new type.model(message, { parse: true })

    app.view.primary(new type({
        model: model
    }))
}

function socketBalance(message) {
    app.user.set('balance', message.balance)
}

function socketKitty(message) {
    var self = this
    , Kitty = require('./views/minigames/Kitty')
    , kitty = new Kitty(message.hint, message.alternatives)
    app.view.minigames.game(kitty)

    // return to welcome view in 15 sec
    setTimeout(function() {
        debug('restoring welcome view')

        var welcome = new (require('./views/minigames/Welcome'))()
        app.view.minigames.game(welcome)
    }, 20 * 1000)
}

function windowError(error) {
    try {
      alertify.error(error.message || JSON.stringify(error))
    } catch(e) {
        debug('failed to display error to user')
    }
}

$(function() {
    debug('creating and connecting socket')

    window.onerror = windowError

    var secure = window.location.protocol === 'https:'

    app.socket = io.connect(window.location.protocol + '//' + window.location.host, { secure: secure })
    enableSocketDebugging()
    app.socket.on('connect', socketConnect)
    app.socket.on('connect_failed', socketConnectFailed)
    app.socket.on('error', socketError)
    app.socket.on('user', socketUser)
    app.socket.on('balance', socketBalance)
    app.socket.on('join', socketJoin)
    app.socket.on('kitty', socketKitty)

    app.router = new Router()

    app.socket.once('user', function() {
        Backbone.history.start()
    })

    app.socket.once('guest', function() {
        Backbone.history.start()
    })
})