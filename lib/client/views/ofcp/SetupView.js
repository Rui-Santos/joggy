var _ = require('underscore')
, HandView = require('./HandView')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, CardView = require('./CardView')
, UnsetCardsView = require('./UnsetCardsView')
, SetupView = module.exports = function(assets) {
    this.assets = assets

    this.cards = []

    this.$el = $('<div>')
    this.hv = new HandView(assets)
    this.hv.$el.appendTo(this.$el)

    this.hv.back.$el.click(_.bind(this.settingClick, this, this.hv.back))
    this.hv.mid.$el.click(_.bind(this.settingClick, this, this.hv.mid))
    this.hv.front.$el.click(_.bind(this.settingClick, this, this.hv.front))

    this.ucv = new UnsetCardsView(assets)
    this.ucv.$el.appendTo(this.$el)

    this.$done = $('<button>Done</button>').addClass('done').appendTo(this.$el).toggle(false)
    this.$done.click(this.onClickDone.bind(this))
}

util.inherits(SetupView, EventEmitter)

SetupView.prototype.onClickDone = function(e) {
    this.emit('done', {
        cards: this.cardsSetting.map(function(cv) {
            return {
                card: cv.index,
                setting: cv.placed().index
            }
        })
    })

    _.each(this.cardsSetting, function(cv) {
        cv.locked(true)
    })

    this.cardsSetting = null
    this.$done.hide()
}

SetupView.prototype.done = function(cards) {
    console.log(cards)
    var that = this
    _.each(cards, function(c) {
        // already placed? this trick can be used
        // because ofc uses only one deck
        if (_.any(that.cards, function(known) {
            return c.card === known.index
        })) {
            return
        }

        console.log(c)

        var setting = c.setting === 0 ? that.hv.back :
            c.setting === 1 ? that.hv.mid :
            that.hv.front
        , cv = new CardView(that.assets, c.card)
        setting.add(cv)
        cv.locked(true)
    })
}

SetupView.prototype.deal = function(cards) {
    var that = this
    , autoset = true

    this.cardsSetting = cards.map(function(card) {
        var cv = new CardView(that.assets, card)
        that.ucv.add(cv)

        cv.$el.click(function(e) {
            console.log('card clicked ' + cv.index)

            // prevent click from triggering on the setting
            e.stopPropagation()

            if (cv.placed()) {
                if (cv.locked()) {
                    return alert('locked card clicked')
                }

                // unset the card
                cv.placed().remove(cv)

                // TODO: should be insert at zero index
                that.ucv.add(cv)

                that.$done.hide()

                return
            }

            console.log('non-placed card clicked')

            // maintain selection on second select
            if (that.selection === cv) return

            // select clicked card
            that.selection && that.selection.selected(false)
            that.selection = cv
            cv.selected(true)
        })

        if (autoset) {
            _.every([that.hv.back, that.hv.mid, that.hv.front], function(s) {
                return !s.add(cv)
            })
        }

        return cv
    })

    this.cards = this.cards.concat(this.cardsSetting)

    if (autoset) {
        this.onClickDone()
    }
}

SetupView.prototype.settingClick = function(setting) {
    var cv = this.selection || this.ucv.cards[0]

    // no cards left to set
    if (!cv) return

    // any room?
    if (!setting.add(cv)) return

    console.log('setting card ' + cv.index)

    // remove from unplaced internal array
    this.ucv.cards.splice(this.ucv.cards.indexOf(cv), 1)

    this.ucv.cards.length || this.$done.show()

    if (cv === this.selection) {
        cv.selected(false)
        this.selection = null
    }
}
