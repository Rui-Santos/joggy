var Backbone = require('backbone')
, _ = require('underscore')
, WelcomeMinigame = require('./Welcome')
, MinigameView = module.exports = Backbone.View.extend({
    el: '#minigames-container',

    initialize: function() {
        this.el.width = 300
        this.el.height = 125

        var welcome = new WelcomeMinigame()
        this.game(welcome)
    },

    game: function(value) {
        if (!_.isUndefined(value) && value !== this.game.value) {
            this.game.value && this.game.value.dispose && this.game.value.dispose()
            this.game.value = value
            this.game.value.init(this.el)
        }

        return this.game.value || null
    }
})
