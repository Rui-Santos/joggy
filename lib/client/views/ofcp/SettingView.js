var CardSlotView = require('./CardSlotView')
, SettingView = module.exports = function(index, capacity) {
    this.$el = $('<div>')
    this.slots = []
    this.index = index

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
    cv.placed(this)
    return true
}

SettingView.prototype.remove = function(cv) {
    // TODO: this will leave gaps when removing a card which is not the last
    // not removing card here because it will be moved somewhere else
    var slot = _.where(this.slots, { card: cv })[0]
    if (!slot) throw new Error('card not set in this setting')
    slot.card = null
    cv.placed(null)
}
