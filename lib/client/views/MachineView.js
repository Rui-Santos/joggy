var Backbone = require('backbone')
, Queue = require('../Queue')
, crypto = require('crypto')
, shuffle = require('../shuffle')
, job = require('../vp-job')
, PaytableView = require('./PaytableView')
, MachineView = module.exports = Backbone.View.extend({
    className: 'machine',

    initialize: function() {
        this.prefix = 'machine ' + this.model.id;
        this.queue = new Queue();
        this.queue.drain = function() { console.log('----------------------------'); };

        this.app = require('../entry');

        this.hand = [];

        if (this.model.get('state') === 'hold') {
            this.seen = [];
        }

        this.vm = new Backbone.Model({
            jackpot: null
        });

        this.model.on('change:bet', function() {
            this.paytable.viewModel.set('highlightedCoin', this.model.get('bet'));
            this.render();
        }, this);

        this.vm.on('change:jackpot', function() {
            console.log('setting jackpot on that other things');
            this.paytable.viewModel.set('jackpot', this.vm.get('jackpot'));
        }, this);

        this.model.get('hand').each(function(card) {
            var view = new Views.Card({ model: card });
            view.$el.appendTo(this.$el);
            view.on('click', _.bind(function() { this.onCardClick(view); }, this));

            if (this.model.get('state') === 'hold') {
                this.seen.push(card.get('value'));
            }

            this.hand.push(view);
        }, this);

        this.subscribe('state', this.onSocketState, this);
        this.subscribe('deal', this.onSocketDeal, this);
        this.subscribe('reveal', this.onSocketReveal, this);
        this.subscribe('draw', this.onSocketDraw, this);
        this.subscribe('jackpot', this.onSocketJackpotChange, this);
        this.subscribe('contribution', this.onSocketContribution, this);

        this.options.app.user.on('change:balance', this.render, this);
        this.options.app.user.on('change:balance', function() {
            if (this.model.get('bet') > this.options.app.user.get('balance')) {
                if (this.options.app.user.get('balance') >= 1) {
                    this.model.set('bet', Math.floor(this.options.app.user.get('balance')));
                }
            }
        }, this);

        this.$balance = $('<div class="balance">?</div>').appendTo(this.$el);
        this.$bet = $('<div class="bet">?</div>').appendTo(this.$el);

        this.$deal = $('<div class="deal"></div>').appendTo(this.$el);
        this.$deal.on('click', _.bind(this.onDealClick, this));

        this.$betOne = $('<div class="betOne"></div>').appendTo(this.$el);
        this.$betOne.on('click', _.bind(this.onBetOneClick, this));

        this.$betMax = $('<div class="betMax"></div>').appendTo(this.$el);
        this.$betMax.on('click', _.bind(this.onBetMaxClick, this));

        this.paytable = new PaytableView({
            table: this.model.get('paytable')
        });
        this.paytable.viewModel.set('jackpot', this.vm.get('jackpot'));

        this.paytable.$el.appendTo(this.$el);
        this.paytable.viewModel.set('highlightedCoin', this.model.get('bet'));

        window.onresize = _.bind(this.layout, this);

        this.layout();
        this.render();
    },

    onSocketJackpotChange: function(message, callback) {
        console.log('updating jackpot to', message.current);
        this.vm.set('jackpot', message.current);
        callback();
    },

    onBetOneClick: function() {
        var max = Math.min(5, Math.floor(this.options.app.user.get('balance') / 1e5));
        this.model.set('bet', this.model.get('bet') % max + 1);
    },

    onBetMaxClick: function() {
        var max = Math.min(5, Math.floor(this.options.app.user.get('balance') / 1e5));
        this.model.set('bet', max);
        this.bet();
    },

    onSocketContribution: function(message, callback) {
      this.model.get('contributions')[message.player] = message.contribution;

      callback();
    },

    onSocketReveal: function(message, callback) {
        var factors = [message.secret];
        factors = factors.concat(_.values(this.model.get('contributions')));
        var deck = shuffle(factors);

        _.each(this.seen, function(card) {
          console.log('observed', card, 'expected', deck.pop());
        });

        this.model.set('contributions', {});

        var rank = job.rank(this.model.get('hand').plain());

        this.paytable.viewModel.set({
            highlightedRank: rank
        });

        var payout = job.payout(this.model.get('hand').plain(), '9-6', this.model.get('bet'));

        /*
        if (payout > 0) {
            alertify.success('win ' + payout + ' credits')
        }
        */

        this.options.app.user.set('balance', this.options.app.user.get('balance') + payout * 1e5);

        callback();
    },

    onSocketDraw: function(message, callback) {
        _.each(message.drawn, function(drawn) {
            this.model.get('hand').at(drawn.index).set(drawn.card, { parse: true });
            this.seen.push(drawn.card.value);
        }, this);

        this.render();

      callback();
    },

    onSocketDeal: function(message, callback) {
        _.each(message.hand, function(card, index) {
            this.model.get('hand').at(index).set('value', card.value);
        }, this);

        this.model.set('state', 'hold');

        this.render();

        callback();
    },

    onSocketState: function(message, callback) {
        console.log('state: ' + message.state);
        this.model.set('state', message.state);
        this.render();
        callback();
    },

    layout: function() {
        var size = { x: 0, y: 0 };
        var container = { width: this.$el.width(), height: this.$el.height() };

      var desired = 1.1 / 1, actual = container.width / container.height;
      console.log('container', container.width, container.height);

      if (actual <= desired) {
          size.x = container.width;
          size.y = container.width / desired;
      } else {
          size.y = container.height;
          size.x = container.height / desired;
      }

      this.$el.css({ width: size.x, height: size.y });

      var offset = { x: 0.01, y: 0.55};
      var ratio = 500 / 726;
      var cardSize = { x: 0.192, y: 0.192 / ratio };

      _.each(this.hand, function(view, i) {
          var $card = view.$el;
          $card.css({
            left: offset.x * size.x,
            top: offset.y * size.y,
            width: cardSize.x * size.x,
            height: cardSize.x * size.x / ratio
          });

          view.$img.css({
              width: cardSize.x * size.x,
              height: cardSize.x * size.x / ratio
          });

        view.$hold.css({
            'font-size': 0.028 * size.y,
            top: cardSize.y * -0.15 * size.y,
            left: cardSize.x * size.x * 0.27,
            height: cardSize.y * 0.5 * size.y
        });

          offset.x += cardSize.x + 0.005;
      });

      this.$deal.css({
        top: 0.86 * size.y,
        left: 0.83 * size.x,
        'font-size': 0.05 * size.y
      });

      this.$betOne.css({
        top: 0.86 * size.y,
        left: 0.57 * size.x,
        'font-size': 0.05 * size.y
      });

      this.$betMax.css({
        top: 0.86 * size.y,
        left: 0.3 * size.x,
        'font-size': 0.05 * size.y
      });

      this.$balance.css({
        top: 0.94 * size.y,
        left: 0.03 * size.x,
        'font-size': 0.05 * size.y
      });

      this.$bet.css({
        top: 0.94 * size.y,
        left: 0.57 * size.x,
        'font-size': 0.05 * size.y
      });

      this.paytable.layout(size);
    },

    subscribe: function(name, fn, context) {
        if (context) fn = _.bind(fn, context);
        this.options.app.socket.on(this.prefix + ':' + name, _.bind(function(message) {
            this.queue(_.bind(function(callback) {
                fn(message, callback);
            }, this));
        }, this));
    },

    bet: function() {
        this.paytable.viewModel.set({
            highlightedRank: null
        });

        this.send('contribute', { contribution: crypto.createHash('sha1').update(Math.random()).digest('hex') });
        this.send('deal', { bet: this.model.get('bet') });
        this.options.app.user.set('balance', this.options.app.user.get('balance') - this.model.get('bet') * 1e5);
    },

    onDealClick: function() {
        if (this.model.get('state') === 'betting') {
            if (this.options.app.user.get('balance') >= this.model.get('bet') * 1e5) {
                this.bet();
            }
        }

        if (this.model.get('state') === 'hold') {
            this.deal();
        }
    },

    deal: function() {
        var held = [];
        this.seen = this.model.get('hand').pluck('value');

        _.each(this.hand, function(view, index) {
            if (view.held()) {
                held[index] = true;
            }
        }, this);


        this.send('hold', { hold: held });
        this.model.set('state', 'betting');

        _.each(this.hand, function(hand) {
            hand.held(false);
        });
    },

    onCardClick: function(view) {
        if (this.model.get('state') !== 'hold') {
            console.log('card clicked when in ' + this.model.get('state') + ' state');
            return;
        }

        view.held(!view.held());
    },

    send: function(name, message) {
        this.options.app.socket.emit(this.prefix + ':' + name, message);
    },

    render: function() {
        this.$balance.html(Math.floor(this.options.app.user.get('balance') / 1e5));
        this.$bet.html(this.model.get('bet'));

        _.each(this.hand, function(card) {
            card.render();
        });

        this.$betMax.toggle(this.model.get('state') == 'betting' && this.options.app.user.get('balance') >= 1e5);
        this.$betOne.toggle(this.model.get('state') == 'betting' && this.options.app.user.get('balance') >= 1e5);

        this.paytable.render();

        return this;
    }
});