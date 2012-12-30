var Backbone = require('backbone')
, _ = require('underscore')
, TopBarView = require('./TopBarView')
, ChatView = require('./ChatView')
, MinigamesContainer = require('./minigames/Container.js')
, AppView = module.exports = Backbone.View.extend({
    initialize: function() {
        this.topBar = new TopBarView()
        this.topBar.render()

        this.chat = new ChatView()
        this.chat.render()

        this.minigames = new MinigamesContainer()

        window.onresize = _.bind(this.resizeFromWindowSize, this)

        this.resizeFromWindowSize()
    },

    primary: function(value) {
        if (!_.isUndefined(value)) {
            console.log('setting primary view to ' + value.cid)

            if (this.primary.value) {
                this.primary.value.dispose ?
                    this.primary.value.dispose() :
                    this.primary.value.remove()
            }

            this.primary.value = value
            this.resizeFromWindowSize()
            value.render()
            value.$el.appendTo('#primary-container')
        }

        return this.primary.value || null
    },

    resizeFromWindowSize: function() {
        var $window = $(window)
        , clientWidth = $window.width()
        , clientHeight = $window.height()

        this.resize(clientWidth, clientHeight)
    },

    resize: function(width, height) {
        if (!this.primary.value) {
            return
        }

        this.primary.value.rect(0, 0, width - 300, height - 42)
        this.chat.rect(0, 0, 300, height - 150)
    },

    render: function() {
        return this
    }
})