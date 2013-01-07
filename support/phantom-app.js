var sassets = require('sassets')
, path = require('path')
, express = require('express')
, fs = require('fs')
, _ = require('underscore')
, async = require('async');

module.exports = function() {
    var app = express()

    app.get('/scripts.js', function(req, res, next) {
        var srcs = [
            { path: 'assets/vendor/jquery-1.8.2.js' },
            { path: 'node_modules/mocha/mocha.js' },
            { type: 'browserify', path: 'test/client/index.js' }
        ]

        async.map(srcs, sassets.load, function(err, srcs) {
            if (err) return next(err);
            res.end(_.reduce(srcs, function(a, b) { return a + b }));
        });
    });

    app.get('/styles.css', function(req, res, next) {
        var styles = [
            { path: 'node_modules/mocha/mocha.css' }
        ];
        async.map(styles, sassets.load, function(err, styles) {
            if (err) return next(err);
            res.end(_.reduce(styles, function(a, b) { return a + b }));
        });
    });

    app.get('/', function(req, res, next) {
        fs.readFile(path.join(__dirname, 'browser-tests.html'), 'utf8', function(err, html) {
            res.end(html)
        })
    })

    return app;
}
