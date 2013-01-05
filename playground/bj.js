process.env.DEBUG || (process.env.DEBUG = '.*');

var http = require('http')
, express = require('express')
, app = express()
, listener = http.createServer(app)
, fs = require('fs')
, path = require('path')

app.get('/', function(req, res, next) {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', function(err, f) {
        if (err) return next(err)
        res.end(f)
    })
})

app.use('/media', express.static(path.join(__dirname, '../assets/media')))

var bundle = require('browserify')(path.join(__dirname, 'entry.js'))
app.use(bundle)

listener.listen(9991)
