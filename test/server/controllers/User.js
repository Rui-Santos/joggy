var expect = require('expect.js')
, User = require('../../../lib/server/controllers/User')
, Backbone = require('backbone')
, services = require('../../../lib/server/services')

describe('User', function() {
    describe('wager', function(done) {
        it('fails if balance is lower than wager', function(done) {
            var m = new Backbone.Model({
                balance: 10e5
            })
            , mockDb = {
                get: function() {
                    return {
                        update: function() { arguments[arguments.length - 1](null, 1) }
                    }
                }
            }
            , realDb = services.db
            , u = new User(m)
            realDb = services.db
            services.db = mockDb

            u.wager(11e5, function(err) {
                expect(err).to.be.ok()
                expect(err.code).to.eql('ENOFUNDS')
                done()
            })

            services.db = realDb
        })

        it('succeeds if balance is gte to wager', function(done) {
            var m = new Backbone.Model({
                balance: 11e5
            })
            , mockDb = {
                get: function() {
                    return {
                        update: function() { arguments[arguments.length - 1](null, 1) }
                    }
                }
            }
            , realDb = services.db
            , u = new User(m)
            realDb = services.db
            services.db = mockDb

            u.wager(10e5, function(err) {
                expect(err).to.not.be.ok()

                u.wager(1e5, function(err) {
                    expect(err).to.not.be.ok()
                    services.db = realDb
                    done()
                })
            })
        })
    })
})