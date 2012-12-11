var Backbone = require('backbone')
, Queue = require('../Queue')
, crypto = require('crypto')
, app = require('../app')
, View = require('./View')
, MachineView = module.exports = View.extend({
    initialize: function() {
        this.$el.addClass('machine')
        this.prefix = 'machine ' + this.model.id;
        this.queue = new Queue();
        this.queue.drain = function() { console.log('----------------------------'); }
        this.subscriptions = []
    },

    onSocketMessage: function(fn, message) {
        var self = this
        self.queue(function(leave) {
            fn(message, leave)
        })
    },

    subscribe: function(name, fn, context) {
        if (context) fn = _.bind(fn, context)
        fn = _.bind(this.onSocketMessage, this, fn)
        name = this.prefix + ':' + name
        app.socket.on(name, fn)
        this.subscriptions.push({ name: name, fn: fn })
    },

    dispose: function() {
        this.send('leave', {})

        _.each(this.subscriptions, function(s) {
            console.log('unsubscribing from ' + s.name)
            app.socket.removeListener(s.name, s.fn)
        })

        return View.prototype.dispose.apply(this, arguments)
    },

    send: function(name, message) {
        app.socket.emit(this.prefix + ':' + name, message);
    }
})