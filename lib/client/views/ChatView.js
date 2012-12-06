var _ = require('underscore')
, Backbone = require('backbone')
, app = require('../app')
, ChatView = module.exports = Backbone.View.extend({
    el: '#chat',

    initialize: function() {
        _.bindAll(this);
        this.$messages = this.$el.find('.messages');
        this.$message = this.$el.find('.message');

        app.socket.on('chat', _.bind(this.onSocketChat, this))
    },

    onSocketChat: function(packet) {
        console.log('adding chat packet to display')

        var formatted = '<li><b>' + (packet.from || 'system') + '</b>: ' + packet.message + '</li>'

        if (packet['private']) {
            formatted = '(' + formatted + ')'
        }

        var $element = $(formatted)
        , maxItems = 50

        if (packet.from === 'system') {
            $element.addClass('system')
        } else if (packet.from === 'sprinkles') {
            $element.addClass('sprinkles')
        }

        while (this.$messages.find('>li').length >= maxItems) {
            this.$messages.find('>li').eq(0).remove()
        }

        this.$messages.append($element)
        this.$messages.scrollTop(this.$messages[0].scrollHeight)
    },

    events: {
        'keypress .message': 'messageKeyPress',
        'click .send': 'sendClick'
    },

    rect: function(x, y, width, height) {
        this.$el.css({
            left: x,
            top: y,
            width: width,
            height: height
        })

        this.$el.find('.messages').css({
            width: width,
            height: height - 50
        })
    },

    sendClick: function(e) {
        e.preventDefault();
        this.send();
    },

    messageKeyPress: function(e) {
        if (e.keyCode !== 13) return;
        e.preventDefault();
        this.send();
    },

    send: function() {
        var message = this.$message.val()
        if (!message.length) return
        app.socket.emit('chat', { message: message })
        this.$message.focus().val('')
    }
})