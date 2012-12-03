var _ = require('underscore')
, cards = require('../cards')
, preload = module.exports = function(image) {
    this.loading = 0;

    // png cards
    this.add(_.map(_.range(1, 53), function(x) { return '/media/cards/' + cards.pretty(x) + '.png'; }));
};

_.extend(preload.prototype, {
    add: function(src) {
        if (_.isArray(src)) {
            return _.each(src, this.add, this);
        }

        var image = new Image;
        image.src = src;
        image.onload = _.bind(this.onImageLoad, this);
        this.loading++;

        return image;
    },

    onImageLoad: function(image) {
        if (!--this.loading && this.drain) {
            this.drain();
        }
    }
});