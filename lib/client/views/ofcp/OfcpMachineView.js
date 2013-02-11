var _ = require('underscore')
, app = require('../../app')
, MachineView = require('../MachineView')
, debug = require('debug')('joggy:ofcp')
, cu = require('../../canvas')
, Models = require('../../models')
, TableView = require('./TableView')
, OfcpMachineView = module.exports = MachineView.extend({
    className: 'ofcp-machine',

    assetsLoaded: function() {
        var self = this

        debug('assets loaded')

        this.table = new TableView(this.assets)
        this.bindTo(this.table, 'sit', this.onTableSit.bind(this))
        this.bindTo(this.table, 'done', this.onTableDone.bind(this))
        this.$el.append(this.table.$el)
    },

    onTableSit: function() {
        this.send('sit', {})
    },

    onTableDone: function(e) {
        this.send('done', e)
    },

    initialize: function() {
        var self = this
        MachineView.prototype.initialize.apply(this, arguments)

        debug('loading assets')

        // load assets while maintaining lock
        self.queue(function(leave) {
            cu.loadAssets({
                cards: 'http://tekeye.biz/download/small_playing_cards.svg'
            }, function (err, a) {
                if (err) throw err
                self.assets = a
                self.assetsLoaded()
                leave()
            })
        })

        this.subscribe('sit', this.onSit, this)
        this.subscribe('deal', this.onDeal, this)
        this.subscribe('done', this.onDone, this)
    },

    onDeal: function(packet, cb) {
        var spot = this.table.spots[packet.spot]
        spot.deal(packet.cards)
        cb()
    },

    onDone: function(packet, cb) {
        var spot = this.table.spots[packet.spot]
        spot.done(packet.cards)
        cb()
    },

    onSit: function(packet, cb) {
        var spot = this.table.spots[packet.spot]
        spot.user(packet.user)
        cb()
    },

    size: { w: 1000, h: 700 },

    rect: function(x, y, width, height) {
    },

    render: function() {
        return this;
    }
})

OfcpMachineView.model = Models.OfcpMachine
