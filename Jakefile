process.env.DEBUG = ''
process.env.NODE_ENV = 'testing'

require('shelljs/global')

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
