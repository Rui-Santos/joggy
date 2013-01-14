var Backbone = require('backbone')
_ = require('underscore')
, debug = require('debug')('joggy:View')
, View = module.exports = Backbone.View.extend({
    bindTo: function(target, name, callback, context) {
        this.bindings || (this.bindings = [])
        this.bindings.push({ target: target, name: name, callback: callback })

        if (target.bind) {
            target.bind(name, callback, context)
        } else {
            target.on(name, callback, context)
        }
    },

    dispose: function() {
        debug('disposing of view', this)

        // this will unbind all events that this view has bound to
        _.each(this.bindings, function(b) {
            if (b.target.unbind) {
                b.target.unbind(b.name, b.callback)
            } else if (b.target.removeListener) {
                b.target.removeListener(b.name, b.callback)
            } else {
                debug('cannot unbind from event %s', b.name)
            }
        })

        this.bindings = null

        // this will unbind all listeners to events from this view. This is probably not necessary because this view will be garbage collected.
        this.unbind()

        $(this.el).removeData().unbind()

        this.undelegateEvents()

        // uses the default Backbone.View.remove() method which removes this.el from the DOM and removes DOM events.
        Backbone.View.prototype.remove.call(this, arguments)
    }
});