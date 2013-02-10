var util = require('util')
, SpotView = require('./SpotView')
, EventEmitter = require('events').EventEmitter
, TableView = module.exports = function() {
    this.$el = $('<div>').addClass('table')

    this.$sit = $('<button>Sit</button>').addClass('sit').appendTo(this.$el)
    this.$sit.on('click', this.onClickSit.bind(this))

    this.spots = []

    for (var i = 0; i < 3; i++) {
        var sv = new SpotView()
        this.spots.push(sv)
        this.$el.append(sv.$el)
        sv.$el.addClass('spot-' + (i + 1))
    }
}

util.inherits(TableView, EventEmitter)

TableView.prototype.onClickSit = function() {
    this.emit('sit', {})
}
