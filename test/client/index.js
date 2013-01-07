mocha.ui('bdd')
mocha.reporter('html')

require('./chatTransforms')
require('./views')

window.mochaPhantomJS ? mochaPhantomJS.run() : mocha.globals([ 'script*' ]).run()
