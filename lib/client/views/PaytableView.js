var _ = require('underscore')
, Backbone = require('backbone')
, job = require('../vp-job')
, Paytableview = module.exports = Backbone.View.extend({
    className: 'paytable',
    tagName: 'table',
    
    initialize: function() {
        this.viewModel = new Backbone.Model({
            highlightedRank: null,
            highlightedCoin: 5,
            jackpot: null
        });

        this.viewModel.on('change', this.render, this);
    },

    layout: function(size) {
      this.$el.css({
        top: size.y * 0.01,
        left: size.x * 0.01,
        width: size.x * 0.98,
        height: size.y * 0.45,
        'border-width': 0.005 * size.x,
        'font-size': 0.025 * size.y
      });
    },

    render: function() {
        this.$el.empty();

        var table = job.payouts[this.options.table];

        for (var rank = 0; rank < job.ranks.length; rank++) {
            var $row = $('<tr>');
            this.$el.prepend($row);

            var $rank = $('<td>' + job.ranks[rank] + '</td>').appendTo($row);

            if (this.viewModel.get('highlightedRank') === rank) {
                $rank.addClass('highlight');
            }

            for (var coins = 1; coins <= 5; coins++) {
                var value = table[coins][rank];

                if (this.viewModel.get('jackpot') !== null && coins === 5 && rank === job.ranks.length - 1) {
                    value = this.viewModel.get('jackpot') / 1e5;
                }

                if (coins === 5 && rank === job.ranks.length - 1) {
                    value = value.toFixed(2);
                }

                var $cell = $('<td />').html(value).appendTo($row);

                if (this.viewModel.get('highlightedCoin') == coins) {
                    $cell.addClass('highlight');
                }
            }
        }

        return this;
    }
});