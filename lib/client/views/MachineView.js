var Backbone = require('backbone')
, Queue = require('../Queue')
, crypto = require('crypto')
, shuffle = require('../shuffle')
, job = require('../vp-job')
, app = require('../app')
, PaytableView = require('./PaytableView')
, MachineView = module.exports = Backbone.View.extend({
    className: 'machine',

    initialize: function() {
        this.prefix = 'machine ' + this.model.id;
        this.queue = new Queue();
        this.queue.drain = function() { console.log('----------------------------'); };

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
            var view = new Views.CardView({ model: card });
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

        app.user.on('change:balance', this.render, this);
        app.user.on('change:balance', function() {
            if (this.model.get('bet') > app.user.get('balance')) {
                if (app.user.get('balance') >= 1) {
                    this.model.set('bet', Math.floor(app.user.get('balance')));
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

        this.render();
    },

    onSocketJackpotChange: function(message, callback) {
        console.log('updating jackpot to', message.current);
        this.vm.set('jackpot', message.current);
        callback();
    },

    onBetOneClick: function() {
        var max = Math.min(5, Math.floor(app.user.get('balance') / 1e5));
        this.model.set('bet', this.model.get('bet') % max + 1);
    },

    onBetMaxClick: function() {
        var max = Math.min(5, Math.floor(app.user.get('balance') / 1e5));
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

        app.user.set('balance', app.user.get('balance') + payout * 1e5);

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

    rect: function(x, y, width, height) {
        this.$el.css({
            left: x,
            top: y,
            width: width,
            height: height
        })

      var offset = { x: 0.01, y: 0.55};
      var ratio = width / height
      var cardSize = { x: 0.192, y: 0.192 / ratio };

      _.each(this.hand, function(view, i) {
          var $card = view.$el;
          $card.css({
            left: offset.x * width,
            top: offset.y * height,
            width: cardSize.x * width,
            height: cardSize.x * width / ratio
          });

          view.$img.css({
              width: cardSize.x * width,
              height: cardSize.x * width / ratio
          });

        view.$hold.css({
            'font-size': 0.028 * height,
            top: cardSize.y * -0.15 * height,
            left: cardSize.x * width * 0.27,
            height: cardSize.y * 0.5 * height
        });

          offset.x += cardSize.x + 0.005;
      });

      this.$deal.css({
        top: 0.86 * height,
        left: 0.83 * width,
        'font-size': 0.04 * height,
        'padding-top': 0.01 * height,
        'padding-bottom': 0.01 * height
      });

      this.$betOne.css({
        top: 0.86 * height,
        left: 0.57 * width,
        'padding-top': 0.01 * height,
        'padding-bottom': 0.01 * height,
        'font-size': 0.04 * height
      });

      this.$betMax.css({
        top: 0.86 * height,
        left: 0.3 * width,
        'padding-top': 0.01 * height,
        'padding-bottom': 0.01 * height,
        'font-size': 0.04 * height
      });

      this.$balance.css({
        top: 0.94 * height,
        left: 0.03 * width,
        'font-size': 0.04 * height
      });

      this.$bet.css({
        top: 0.94 * height,
        left: 0.57 * width,
        'font-size': 0.04 * height
      });

        this.paytable.rect(0, 0, width, height * 0.45)
    },

    subscribe: function(name, fn, context) {
        if (context) fn = _.bind(fn, context);
        app.socket.on(this.prefix + ':' + name, _.bind(function(message) {
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
        app.user.set('balance', app.user.get('balance') - this.model.get('bet') * 1e5);
    },

    onDealClick: function() {
        if (this.model.get('state') === 'betting') {
            if (app.user.get('balance') >= this.model.get('bet') * 1e5) {
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
        app.socket.emit(this.prefix + ':' + name, message);
    },

    render: function() {
        this.$balance.html(Math.floor(app.user.get('balance') / 1e5));
        this.$bet.html(this.model.get('bet'));

        _.each(this.hand, function(card) {
            card.render();
        });

        this.$betMax.toggle(this.model.get('state') == 'betting' && app.user.get('balance') >= 1e5);
        this.$betOne.toggle(this.model.get('state') == 'betting' && app.user.get('balance') >= 1e5);

        this.paytable.render();

        return this;
    }
});