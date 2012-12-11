var Backbone = require('backbone')
, _ = require('underscore')
, TopBarView = require('./TopBarView')
, ChatView = require('./ChatView')
, AppView = module.exports = Backbone.View.extend({
    initialize: function() {
        this.topBar = new TopBarView()
        this.topBar.render()

        this.chat = new ChatView()
        this.chat.render()

        window.onresize = _.bind(this.resizeFromWindowSize, this)

        this.resizeFromWindowSize()
    },

    primary: function(value) {
        if (!_.isUndefined(value)) {
            console.log('setting primary view', value)

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
        if (!this.primary.value) return

        // space not occupied by the minimum chat or the top bar
        var spareWidth = width - 300
        , spareHeight = height - 50

        // machine sizing
        var desiredRatio = this.primary.value.ratio
        , actualRatio = spareWidth / spareHeight
        , primaryWidth = desiredRatio > actualRatio ? spareWidth : spareHeight * desiredRatio
        , primaryHeight = desiredRatio < actualRatio ? spareHeight : spareWidth / desiredRatio

        if (this.primary.value) {
            this.primary.value.rect(0, 50, primaryWidth, primaryHeight - 50)
        }

        var chatWidth = Math.min(width - primaryWidth, 500)

        this.chat.rect(primaryWidth, 50, chatWidth, primaryHeight - 50)
    },

    render: function() {
        return this
    }
})