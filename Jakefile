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

task('install', function() {
    jake.exec([
        'sudo apt-get install -y python-software-properties',
        'sudo add-apt-repository -y ppa:chris-lea/node.js',
        'sudo apt-get update -y',
        'sudo apt-get install -y nodejs npm g++ libssl-dev libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential',
        'sudo apt-get upgrade -y',
    ], {
        printStdout: true,
        printStderr: true
    })
})

task('test-browser', function() {
    var http = require('http')
    , app = require('./support/phantom-app.js')()
    , server = http.createServer(app)
    server.listen(9572)

    jake.exec('mocha-phantomjs http://localhost:9572', function() {
        server.close()
    }, {
        printStdout: true,
        printStderr: true
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

    fs.writeFileSync(path.join(__dirname, 'assets/media/rwb/sprites.json'), result.output, 'utf8')

    popd()
})

task('sprites-kitty', function() {
    pushd('assets/media/kitty')

    var fns = ls().filter(function(fn) {
        return !fn.match(/^symbols\./)
    })

    var result = exec('imgpk symbols.png ' + fns.join(' '), { silent: true })
    if (result.code) return fail()

    fs.writeFileSync('symbols.json', result.output, 'utf8')

    popd()
})

task('sprites', ['sprites-cards', 'sprites-rwb', 'sprites-kitty'])

task('publish', ['sprites', 'test'], function() {
    jake.exec([
        'git checkout prod',
        'git merge master',
        'git checkout master',
        'git push prod prod:master'
    ])
})
