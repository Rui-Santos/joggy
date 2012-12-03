var _ = require('underscore')
, Backbone = require('backbone')
, ChatView = module.exports = Backbone.View.extend({
    el: '#chat',

    initialize: function() {
        _.bindAll(this);
        this.$messages = this.$el.find('.messages');
        this.$message = this.$el.find('.message');
        this.options.app.socket.on('chat', this.onSocketChat);
    },

    onSocketChat: function(message) {
        var formatted = '[' + (message.user || 'system') + '] ' + message.text;
        this.$messages.val(this.$messages.val() + '\r\n' + formatted);
        this.$messages.scrollTop(this.$messages[0].scrollHeight);
    },

    events: {
        'keypress .message': 'messageKeyPress',
        'click .send': 'sendClick'
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
        this.options.app.socket.emit('chat', { text: text });
        this.$message.focus().val('');
    }
});