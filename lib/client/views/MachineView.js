var Backbone = require('backbone')
, Queue = require('../Queue')
, crypto = require('crypto')
, app = require('../app')
, MachineView = module.exports = Backbone.View.extend({
    initialize: function() {
        this.$el.addClass('machine')
        this.prefix = 'machine ' + this.model.id;
        this.queue = new Queue();
        this.queue.drain = function() { console.log('----------------------------'); };
    },

    send: function(name, message) {
        app.socket.emit(this.prefix + ':' + name, message);
    }
})