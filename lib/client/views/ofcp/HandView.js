var SettingView = require('./SettingView')
, HandView = module.exports = function() {
    this.$el = $('<div>')
    this.front = new SettingView(2, 3)
    this.front.$el.css({
        clear: 'both'
    })
    this.$el.append(this.front.$el)

    this.mid = new SettingView(1, 5)
    this.mid.$el.css({
        clear: 'both',
        'padding-top': 10
    })
    this.$el.append(this.mid.$el)

    this.back = new SettingView(0, 5)
    this.back.$el.css({
        clear: 'both',
        'padding-top': 10
    })
    this.$el.append(this.back.$el)
}
