var CardSlotView = module.exports = function() {
    this.$el = $('<div>').css({
        border: 'dashed 1px black',
        width: 44,
        height: 62
    })

    this.card = null
}
