mocha.ui('bdd')
mocha.reporter('html')

require('./chatTransforms')

window.mochaPhantomJS ? mochaPhantomJS.run() : mocha.run()
