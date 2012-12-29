var expect = require('expect.js')
, User = require('../../../lib/server/controllers/User')
, Backbone = require('backbone')

describe('User', function() {
    describe('wager', function() {
        it('fails when user balance is too low', function(done) {
            var model = new Backbone.Model({
                balance: 5e8
            })

            var u = new User(model)

            u.wager(6e8, 'test', function(err) {
                expect(err).to.be.ok()
                done()
            })
        })

        it('succeeds when user balance is equal', function(done) {
            var Model = Backbone.Model.extend({
                idAttribute: '_id'
            })

            var model = new Model({
                _id: 'bob',
                wagered: 0,
                balance: 5e8,
            }, {
                idAttribute: '_id'
            })
            , services = require('../../../lib/server/services')

            services.db = {
                get: function(name) {
                    if (name === 'users') {
                        return {
                            update: function(q, u, cb) {
                                expect(q).to.eql({ _id: 'bob' })
                                expect(u).to.eql({
                                    $set: {
                                        balance: 0,
                                        wagered: 5e8
                                    }
                                })

                                cb(null, 1)
                            }
                        }
                    } else if (name === 'users.log') {
                        console.log('derp')
                        return {
                            insert: function(x, cb) {
                                cb && cb()
                            }
                        }
                    }
                }
            }

            var u = new User(model)

            u.wager(5e8, 'test', function(err) {
                expect(err).to.not.be.ok()

                expect(model.get('balance')).to.be(0)
                expect(model.get('wagered')).to.be(5e8)

                services.db = null
                done()
            })
        })
    })
})
