var HandView = require('./HandView')
, UnsetCardsView = require('./UnsetCardsView')
, SetupView = module.exports = function() {
    this.$el = $('<div>')
    this.hv = new HandView()
    this.hv.$el.appendTo(this.$el)

    this.hv.back.$el.click(_.bind(this.settingClick, this, this.hv.back))
    this.hv.mid.$el.click(_.bind(this.settingClick, this, this.hv.mid))
    this.hv.front.$el.click(_.bind(this.settingClick, this, this.hv.front))

    this.ucv = new UnsetCardsView()
    this.ucv.$el.appendTo(this.$el)
}

SetupView.prototype.settingClick = function(view) {
    var card = this.ucv.selection || this.ucv.cards[0]
    if (!card) return
    if (!view.add(card)) return
    this.ucv.cards.splice(this.ucv.cards.indexOf(card), 1)
    console.log(this.ucv.cards)
    this.ucv.selection = null
}
