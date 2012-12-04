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

    onSocketChat: function(message) {
        console.log('adding chat message to display')

        var escaped = $('<div/>').text(message.text).html()
        , formatted = '<li><b>' + (message.user || 'system') + '</b>: ' + escaped + '</li>'
        , $element = $(formatted)
        , maxItems = 50

        if (message.user === 'system') {
            $element.addClass('system')
        } else if (message.user === 'sprinkles') {
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
        var text = this.$message.val();
        if (!text.length) return;
        app.socket.emit('chat', { text: text })
        this.$message.focus().val('');
    }
})