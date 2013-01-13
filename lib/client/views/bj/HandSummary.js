var bj = require('../../../bj')
, HandSummary = module.exports = function(values) {
    this.node = new Kinetic.Group({
        name: 'hand summary'
    })

    this.rect = new Kinetic.Rect({
        stroke: '#aaa',
        name: 'rect',
        width: 44,
        height: 44,
        opacity: 0.6,
        fill: 'black'
    })
    this.node.add(this.rect)

    this.text = new Kinetic.Text({
        align: 'center',
        fontSize: 20,
        fontFamily: 'Arial',
        //x: this.rect.getWidth() / 2,
        y: this.rect.getHeight() / 2 - 10,
        name: 'text',
        width: this.rect.getWidth()
    })
    this.node.add(this.text)

    this.update(values || [])
}

HandSummary.prototype.update = function(splits, values) {
    var isBj = splits === 0 && bj.isBlackjack(values)

    this.text.setAttrs({
        fontSize: bj.isSoft(values) && !isBj ? 12 : 24
    })

    if (bj.isBust(values)) {
        this.rect.setAttrs({
            fill: 'red'
        })

        this.text.setAttrs({
            textFill: 'white',
            text: bj.pretty(values)
        })
    } else if (isBj) {
        this.rect.setAttrs({
            fill: 'blue'
        })

        this.text.setAttrs({
            textFill: 'white',
            text: 'BJ'
        })
    } else {
        this.rect.setAttrs({
            fill: 'white'
        })

        this.text.setAttrs({
            textFill: 'black',
            text: bj.pretty(values)
        })
    }
}
