var CardSlotView = require('./CardSlotView')
, SettingView = module.exports = function(capacity) {
    this.$el = $('<div>')
    this.slots = []

    for (var i = 0; i < capacity; i++) {
        var slot = new CardSlotView()
        this.slots.push(slot)
        slot.$el.css({
            float: 'left',
            'margin-right': 10
        })
        this.$el.append(slot.$el)
    }
}

SettingView.prototype.add = function(cv) {
    var slot = _.where(this.slots, { card: null })[0]
    if (!slot) return
    slot.card = cv
    slot.$el.append(cv.$el)
    cv.$el.off('click')
    return true
}
