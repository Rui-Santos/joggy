var debug = require('debug')('joggy:auth')
, util = require('util')
, oauth = require('oauth')
, config = require('../../config')
, async = require('async')
, qs = require('qs')
, Models = require('../models')
, services = require('./services')
, self = module.exports = {
    configure: function(app) {
        var oa = new oauth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
             '',
             'https://accounts.google.com/o/oauth2/auth',
             'https://accounts.google.com/o/oauth2/token'
        )

        app.get('/authorize/redirect', function(req, res, next) {
            debug('redirecting user to google for authentication')

            console.log(req.query)

            var body = {
                response_type: 'code',
                client_id: config.google.clientId,
                redirect_uri: config.google.redirect,
                scope: 'https://www.googleapis.com/auth/userinfo.profile',
                state: req.query.after ? req.query.after.substr(0, 50) : ''
            }

            res.redirect(302, 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify(body))
        })

        app.get('/authorize/callback', function(req, res, next) {
            debug('handling callback from oauth')

            if (req.query.error) {
                if (req.query.error === 'access_denied') {
                    debug('access is denied, the user has declined authorization')
                    return res.redirect(302, '/')
                }

                debug('some other, unknown error has been returned from google, ' + req.query.error)

                return next(new Error(req.query.error))
            }

            var code = req.query.code

            if (!code) {
                return new Error('code missing from callback')
            }

            var accessToken, user, google, user_key, user_secret, user_id, apiUser, existingUser, address

            debug('obtaining access token and user info')

            async.series({
                'access token': function(next) {
                    oa.getOAuthAccessToken(code, {
                        redirect_uri: config.google.redirect,
                        grant_type: 'authorization_code'
                    }, function(err, access_token, refresh_token) {
                        if (err) return next(err)
                        accessToken = access_token
                        next()
                    })
                },

                'get user info': function(next) {
                    oa.get(
                        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
                        accessToken,
                        function(err, profile) {
                            if (err) return next(err)
                            profile = JSON.parse(profile)
                            google = profile.id
                            next()
                        }
                    )
                }
            }, function(err) {
                if (err) {
                    console.error(err)
                    return next(err)
                }

                debug('user information obtained, user has google id #' + google)
                req.session.google = google
                res.end('<script>window.location=\'/#' + (req.query.state || '') + '\'</script>')
            })
        })
    }
}