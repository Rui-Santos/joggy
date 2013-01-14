var EventEmitter = require('events').EventEmitter
, util = require('util')
, debug = require('debug')('joggy:Countdown')
, Countdown = module.exports = function(seconds, radius) {
    this.seconds = seconds
    this.radius = radius || 50
    this.lineWidth = 5

    this.node = new Kinetic.Group()

    this.arc = new Kinetic.Shape({
        drawFunc: this.drawArc.bind(this)
    })
    this.node.add(this.arc)

    this.number = new Kinetic.Text({
        textFill: 'white',
        width: (this.radius + this.lineWidth) * 2,
        height: (this.radius + this.lineWidth) * 2,
        y: (this.radius + this.lineWidth) / 2,
        align: 'center',
        fontSize: this.radius
    })
    this.node.add(this.number)
}

util.inherits(Countdown, EventEmitter)

Countdown.prototype.remove = function() {
    this.animation.stop()
    this.node.remove()
    this.node = null
}

Countdown.prototype.start = function() {
    this.animate = this.animate.bind(this)
    this.animation = new Kinetic.Animation(this.animate, this.node.getLayer())
    this.animation.start()
}

Countdown.prototype.animate = function(frame) {
    var secondsLeft = Math.max(0, this.seconds - frame.time / 1e3)
    , fractionLeft = secondsLeft / this.seconds

    this.fractionLeft = fractionLeft

    this.number.setText(Math.round(secondsLeft))

    if (secondsLeft === 0) {
        debug('countdown stopped')
        this.number.setVisible(false)
        this.animation.stop()
    }
}

Countdown.prototype.drawArc = function(canvas) {
    var context = canvas.getContext();
    var percentage = this.fractionLeft
    var degrees = percentage * 360.0;
    var radians = degrees * (Math.PI / 180);

    context.beginPath();
    context.lineWidth = this.lineWidth;
    context.strokeStyle = 'white'

    var x = this.radius + context.lineWidth;
    var y = this.radius + context.lineWidth;
    var r = this.radius;
    var s = 0;//1.5 * Math.PI;

    context.arc(x, y, r, s, radians, false);
    context.stroke();
}
