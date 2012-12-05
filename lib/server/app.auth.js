var debug = require('debug')('joggy:auth')
, db = require('./app.db')
, util = require('util')
, oauth = require('oauth')
, config = require('../../config')
, async = require('async')
, bitcoin = require('./bitcoin')
, qs = require('qs')
, Models = require('../models')
, self = module.exports = {
    randomUsername: function() {
        var first = ['Dr', 'Mr', '', 'Sgt', '', '', '', '', 'Lt', 'Sir', 'Major', 'Prof', 'Duke', 'Baron']
        , middle = ['Bob', 'Joe', 'Jay', 'Ray', 'Cal', 'Rod', 'Rey', 'Lex', 'Rob', 'James']
        , name = first[Math.floor(Math.random() * first.length)] +
            middle[Math.floor(Math.random() * middle.length)] +
            Math.floor(Math.random() * 100)
        return name
    },

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

            var body = {
                response_type: 'code',
                client_id: config.google.clientId,
                redirect_uri: config.google.redirect,
                scope: 'https://www.googleapis.com/auth/userinfo.profile',
                state: ''
            }

            res.redirect(302, 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify(body))
        })

        app.get('/authorize/callback', function(req, res, next) {
            debug('handling callback from oauth')

            if (req.query.error) return next(new Error(req.query.error))

            var code = req.query.code

            if (!code) {
                // possibly disallowed
                return res.redirect(302, '/')
            }

            var accessToken, user, google, user_key, user_secret, user_id, apiUser, existingUser, address

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
                },

                'find existing user': function(next) {
                    debug('looking for existing user')

                    db.get('users').findOne({ google: google }, function(err, u) {
                        if (err) return next(err)
                        user = u
                        if (u) existingUser = true
                        debug('existing user ' + (u ? '' : 'not ') + ' found')
                        next()
                    })
                },

                'get deposit address': function(next) {
                    if (existingUser) return next()

                    debug('getting btc deposit address')

                    bitcoin.getNewAddress(function(err, a) {
                        if (err) return next(err)
                        debug('deposit address retrieved ' + a)
                        address = a
                        next()
                    })
                },

                'insert user in mongo': function(next) {
                    if (existingUser) return next()

                    debug('creating user in mongo')

                    user = {
                        google: google,
                        address: address,
                        balance: 10e5,
                        tx: [],
                        username: self.randomUsername()
                    }

                    debug(util.format('inserting user %j', user))

                    db.get('users').insert(user, next)
                }
            }, function(err) {
                if (err) {
                    console.error(err)
                    return next(err)
                }

                debug('saving session and redirecting')
                req.session.user = user
                debug('session user is ' + util.inspect(req.session.user))

                res.redirect(302, '/')
            })
        })
    }
}