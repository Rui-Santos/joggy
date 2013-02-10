var CardView = require('./CardView')
, UnsetCardsView = module.exports = function() {
    this.$el = $('<div>').addClass('unset-cards')
    this.selection = null
    this.cards = []
}

UnsetCardsView.prototype.add = function(index) {
    var that = this
    , cv = new CardView(index)
    this.cards.push(cv)
    cv.$el.click(_.bind(this.cardClick, this, cv))
    this.$el.append(cv.$el)
}

UnsetCardsView.prototype.cardClick = function(cv) {
    if (this.selection) {
        this.selection.$el.removeClass('selected')
    }

    this.selection = cv
    cv.$el.addClass('selected')
}
