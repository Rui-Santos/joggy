var _ = require('underscore')
, denoms = [
    { value: 1000, color: 'yellow' },
    { value: 500, color: 'purple' },
    { value: 100, color: 'black' },
    { value: 25, color: 'green' },
    { value: 5, color: 'red' },
    { value: 1, color: 'blue' }
]
, ChipStack = module.exports = function(chips) {
    this.shape = new Kinetic.Shape({
        drawFunc: this.drawFunc.bind(this)
    })

    this.chips = chips || 0
    this.radius = 25
}

ChipStack.prototype.drawFunc = function(canvas) {
    if (!this.chips) return

    var self = this
    , ctx = canvas.getContext()
    , remaining = self.chips

    ctx.save()

    _.each(denoms, function(denom) {
        while (remaining >= denom.value) {
            ctx.fillStyle = denom.color
            ctx.shadowOffsetX = ctx.shadowOffsetY = 2
            ctx.shadowBlur = 2
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
            ctx.beginPath()
            ctx.arc(self.radius, self.radius, self.radius / 2, 0, 2 * Math.PI, false)
            ctx.fill()
            ctx.translate(0, -5)
            remaining -= denom.value
        }
    })

    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = (this.radius / 2) + 'px Arial'
    // add 5 to the y because of the post translating in the denom loop
    ctx.fillText(this.chips, this.radius, this.radius + 5)

    ctx.restore()
}
