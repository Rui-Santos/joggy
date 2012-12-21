var _ = require('underscore')
, Backbone = require('backbone')
, app = require('../app')
, chatTransforms = require('../chatTransforms')
, ChatView = module.exports = Backbone.View.extend({
    el: '#chat',

    initialize: function() {
        _.bindAll(this);
        this.$messages = this.$el.find('.messages');
        this.$message = this.$el.find('.message');

        app.socket.on('chat', _.bind(this.onSocketChat, this))
        app.socket.on('chat:usercount', _.bind(this.onSocketChatUserCount), this)

        var placeholders = ['nice', 'fun', 'cool', 'interesting', 'funny']
        , placeholder = placeholders[Math.floor(Math.random() * placeholders.length)]
        , text = 'Say something ' + placeholder + ' + RETURN'
        this.$el.find('.message').attr('placeholder', text)
    },

    onSocketChatUserCount: function(packet) {
        var text = packet.users + ' online'
        this.$el.find('.user-count').html(text)
    },

    onSocketChat: function(packet) {
        console.log('adding chat packet to display')

        var s = chatTransforms(packet.message)

        var formatted = '<li>' +
            '[' +
            moment().format('HH:mm')
            + '] ' +
            (packet['private'] ? '(PRIV ' : '') +
            '<b>' +
            (packet.from || 'system') +
            '</b>: ' +
            s +
            (packet['private'] ? ')' : '') +
            '</li>'

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
        'keypress .message': 'messageKeyPress'
    },

    rect: function(x, y, width, height) {
        this.$el.css({
            width: width,
            height: height
        })

        this.$el.find('.messages').css({
            width: width,
            height: height - 100
        })

        this.$messages.scrollTop(this.$messages[0].scrollHeight)
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