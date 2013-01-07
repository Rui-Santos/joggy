process.env.DEBUG = ''
process.env.NODE_ENV = 'testing'

require('shelljs/global')
var fs = require('fs')
, path = require('path')
, _ = require('underscore')

task('test-node', function() {
    var Mocha = require('mocha')
    , mocha = new Mocha()
    , js = function(f) { return f.match(/\.js$/) }
    mocha.reporter('spec').ui('tdd')

    ls('test/*.js').forEach(mocha.addFile.bind(mocha))
    find('test/server/controllers').filter(js).forEach(mocha.addFile.bind(mocha))

    var runner = mocha.run()
    runner.on('fail', fail)
})

task('test-browser', function() {
    var http = require('http')
    , app = require('./support/phantom-app.js')()
    , server = http.createServer(app)
    server.listen(9572)

    jake.exec('mocha-phantomjs http://localhost:9572', function() {
        server.close()
    })
})

task('test', ['test-node', 'test-browser'])

task('sprites-cards', function() {
    mkdir('-p', 'tmp/cards-smaller')

    // reduce scale
    var cards = require('./lib/cards')
    , fns = []
    , Canvas = require('canvas')

    _.each(cards.deck().concat(0), function(card) {
        var orig = new Canvas.Image()
        , name = card === 0 ? 'back' : cards.pretty(card)
        orig.src = fs.readFileSync('assets/media/cards/' + name + '.png')

        var canvas = new Canvas(orig.width / 2, orig.height / 2)
        , ctx = canvas.getContext('2d')
        ctx.drawImage(orig, 0, 0, canvas.width, canvas.height)

        fs.writeFileSync('tmp/cards-smaller/' + name + '.png', canvas.toBuffer())

        fns.push(name + '.png')
    })

    pushd('tmp/cards-smaller')

    var result = exec('imgpk ../../assets/media/cards.png ' + fns.join(' '), { silent: true })
    if (result.code) return fail()

    fs.writeFileSync(path.join(__dirname, 'assets/card-sprites.json'), result.output, 'utf8')

    popd()

    rm('-rf', 'tmp/cards-smaller')
})

task('sprites-rwb', function() {
    var fns = [
        'seven-red.png',
        'seven-white.png',
        'seven-blue.png',
        'one-bar.png',
        'two-bar.png',
        'three-bar.png'
    ]

    pushd('assets/media/rwb')

    var result = exec('imgpk sprites.png ' + fns.join(' '), { silent: true })
    if (result.code) return fail()

    fs.writeFileSync(path.join(__dirname, 'assets/media/rwb/prites.json'), result.output, 'utf8')

    popd()
})

task('sprites', ['sprites-cards', 'sprites-rwb'])
