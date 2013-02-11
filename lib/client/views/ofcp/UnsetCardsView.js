var CardView = require('./CardView')
, UnsetCardsView = module.exports = function(assets) {
    this.assets = assets
    this.$el = $('<div>').addClass('unset-cards')
    this.selection = null
    this.cards = []
}

UnsetCardsView.prototype.add = function(cv) {
    this.cards.push(cv)
    this.$el.append(cv.$el)
}

UnsetCardsView.prototype.remove = function(cv) {
    // not removing card here because it will be moved somewhere else
    this.cards.splice(this.cards.indexOf(cv), 1)
}

UnsetCardsView.prototype.select = function(cv) {
    alert('select in ucv')
}
