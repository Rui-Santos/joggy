var assets = require('sassets')
, path = require('path')
, _ = require('underscore')
, express = require('express')
, async = require('async')
, fs = require('fs');

module.exports = {
    configure: function(app) {
        var script, scripts = [
            { path: 'assets/vendor/jquery-1.8.2.js' },
            { path: 'assets/vendor/moment.min.js' },
            { path: 'assets/vendor/alertify.min.js' },
            { path: 'assets/vendor/bootstrap.min.js' },
            { path: 'assets/vendor/raf.js' },
            { path: 'vendor/kinetic-v4.2.0.js' },
            { type: 'browserify', path: 'lib/client/entry.js' }
        ]

        async.map(scripts, assets.load, function(err, srcs) {
            if (err) throw err
            script = _.reduce(srcs, function(a, b) { return a + b })
        })

        app.get('/scripts.js', function(req, res, next) {
            res.contentType('text/javascript')
            res.end(script)
        })

        var style

        var styles = [
            { path: 'assets/vendor/bootstrap.min.css' },
            { path: 'assets/vendor/bootstrap-responsive.min.css' },
            { path: 'assets/styles.less' },
            { path: 'assets/vendor/alertify.core.css' },
            { path: 'assets/vendor/alertify.default.css' }
        ]

        async.map(styles, assets.load, function(err, styles) {
            if (err) throw err
            style = _.reduce(styles, function(a, b) { return a + b })
        })

        app.get('/styles.css', function(req, res, next) {
            res.contentType('text/css')
            res.end(style)
        })

        var indexHtml = fs.readFileSync(path.join(__dirname, '../../assets/index.html'), 'utf8')
        indexHtml = indexHtml.replace('{timestamp}', +new Date())

        app.get(/\/($|\?)/, function(req, res, next) {
            res.contentType('text/html')
            res.end(indexHtml)
        })

        app.get(/^\/bitcoin\.otc\.txt(?:\?.+)?/, function(req, res, next) {
            res.contentType('text/plain');
            fs.readFile(path.join(__dirname, '../../assets/bitcoin.otc.txt'), 'utf8', function(err, r) {
                if (err) return next(err);
                res.end(r);
            });
        });

        app.use(express.favicon(__dirname + '/../../assets/media/favicon.ico'));
        app.use('/media', express.static(path.join(__dirname, '../../assets/media'), { maxAge: 1000 * 60 * 60 * 24 }));
    }
}
