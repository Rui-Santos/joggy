var Backbone = require('backbone')
, cards = require('../../cards.js');

module.exports = Backbone.View.extend({
    className: 'card',

    events: {
        'click *': 'onClick'
    },

    initialize: function() {
        this.$img = $('<img />')
            .appendTo(this.$el)
            .on('dragstart', function() {
                // prevent dragging
                return false
            })

        this.$hold = $('<div />')
            .addClass('hold')
            .appendTo(this.$el);

        this.model.on('change', this.render, this);
    },

    held: function(value) {
        if (!_.isUndefined(value) && value !== this._held) {
            this._held = value;
            this.render();
        }

        return !!this._held;
    },

    onClick: function() {
        this.trigger('click');
    },

    render: function() {
        var name = this.model.get('value') ? cards.pretty(this.model.get('value')) : 'back';
        this.$img.attr('src', '/media/cards/' + name + '.png');

        this.$hold.toggle(this.held());

        return this;
    }
});