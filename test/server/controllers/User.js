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
                collection: function(name) {
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
                            },

                            id: function(x) {
                                return x
                            }
                        }
                    } else if (name === 'users.log') {
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

    describe('available', function() {
        it('example', function() {
            var model = new Backbone.Model()
            , user = new User(model)

            model.set({
                balance: 0,
                wagered: 0,
                requirement: 0
            })

            expect(user.available()).to.be(0)

            model.set({
                balance: 0,
                wagered: 20e5,
                requirement: 10e5
            })

            expect(user.available()).to.be(0)

            model.set({
                balance: 50e5,
                wagered: 100e5,
                requirement: 1000e5
            })

            expect(user.available()).to.be(0)

            model.set({
                balance: 11e5,
                wagered: 0,
                requirement: 0
            })

            expect(user.available()).to.be(11e5)

            model.set({
                balance: 7e5,
                wagered: 100e5,
                requirement: 99e5
            })

            expect(user.available()).to.be(7e5)

            model.set({
                balance: 10e5,
                wagered: 8e5,
                requirement: 16e5
            })

            expect(user.available()).to.be(2e5)
        })
    })

    describe('transfer', function() {
        it('fails demands available', function(done) {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5
            })
            , model2 = new Backbone.Model({
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                expect(u).to.be('bob')
                cb(null, user2)
            }

            user1.take = function(satoshi, available, cb) {
                expect(satoshi).to.be(10e5)
                expect(available).to.be(true)
                done()
            }

            user1.transfer('bob', 10e5).done()
        })

        it('throws when username is missing', function() {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5
            })
            , user1 = new User(model1)

            expect(function() {
                user1.transfer(null, 10e5)
            }).to.throwError(/username/)
        })

        it('throws when amount is lte zero', function() {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5
            })
            , user1 = new User(model1)

            expect(function() {
                user1.transfer('alice', 0)
            }).to.throwError(/satoshi/)

            expect(function() {
                user1.transfer('alice', -5)
            }).to.throwError(/satoshi/)
        })

        it('throws when amount is in fractional credits', function() {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5
            })
            , user1 = new User(model1)

            expect(function() {
                user1.transfer('alice', 1.25)
            }).to.throwError(/satoshi/)

            expect(function() {
                user1.transfer('alice', 3.8)
            }).to.throwError(/satoshi/)
        })

        it('fails when the receiving user cannot be found', function() {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5
            })
            , model2 = new Backbone.Model({
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                cb(null, null)
            }

            user1.transfer('bob', 10e5).fail(function(err) {
                expect(err.message).to.match(/not found/)
            }).done()
        })

        it('debits the sending user', function(done) {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5
            })
            , model2 = new Backbone.Model({
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                expect(u).to.be('bob')
                cb(null, user2)
            }

            user1.take = function(satoshi, available, cb) {
                expect(satoshi).to.be(10e5)
                done()
            }

            user1.transfer('bob', 10e5).done()
        })

        it('credits the receiving user', function(done) {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5,
                username: 'bob'
            })
            , model2 = new Backbone.Model({
                username: 'alice'
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                expect(u).to.be('alice')
                cb(null, user2)
            }

            user1.take = function(satoshi, available, cb) {
                cb()
            }

            user2.give = function(satoshi, reason, cb) {
                expect(satoshi).to.be(10e5)
                expect(reason).to.match(/transfer/)
                expect(reason).to.match(/bob/)
                done()
            }

            user1.transfer('alice', 10e5).done()
        })

        it('logs for the sending user', function(done) {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5,
                username: 'bob'
            })
            , model2 = new Backbone.Model({
                username: 'alice'
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                expect(u).to.be('alice')
                cb(null, user2)
            }

            user1.take = function(satoshi, available, cb) {
                cb()
            }

            user2.give = function(satoshi, reason, cb) {
                cb()
            }

            user1.log = function(e, cb) {
                expect(e.amount).to.be(-10e5)
                expect(e.receiver).to.match(/alice/)
                expect(e.type).to.match(/transfer/)
                done()
            }

            user1.transfer('alice', 10e5).done()
        })

        it('emits sentTransfer for sender', function(done) {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5,
                username: 'bob'
            })
            , model2 = new Backbone.Model({
                username: 'alice'
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                expect(u).to.be('alice')
                cb(null, user2)
            }

            user1.take = function(satoshi, available, cb) {
                cb()
            }

            user2.give = function(satoshi, reason, cb) {
                cb()
            }

            user1.log = function(e, cb) {
                expect(e.amount).to.be(-10e5)
                expect(e.receiver).to.match(/alice/)
                expect(e.type).to.match(/transfer/)
                cb()
            }

            user1.on('sentTransfer', function(e) {
                expect(e.receiver).to.eql('alice')
                expect(e.amount).to.eql(10e5)
                done()
            })

            user1.transfer('alice', 10e5).done()
        })

        it('emits receivedTransfer for receiver', function(done) {
            var model1 = new Backbone.Model({
                id: 'derp',
                wagered: 5e5,
                balance: 14e5,
                requirement: 10e5,
                username: 'bob'
            })
            , model2 = new Backbone.Model({
                username: 'alice'
            })
            , user1 = new User(model1)
            , user2 = new User(model2)
            , User_fromUsername = User.fromUsername

            User.fromUsername = function(u, cb) {
                User.fromUsername = User_fromUsername
                expect(u).to.be('alice')
                cb(null, user2)
            }

            user1.take = function(satoshi, available, cb) {
                cb()
            }

            user2.give = function(satoshi, reason, cb) {
                cb()
            }

            user1.log = function(e, cb) {
                expect(e.amount).to.be(-10e5)
                expect(e.receiver).to.match(/alice/)
                expect(e.type).to.match(/transfer/)
                cb()
            }

            user2.on('receivedTransfer', function(e) {
                expect(e.sender).to.eql('bob')
                expect(e.amount).to.eql(10e5)
                done()
            })

            user1.transfer('alice', 10e5).done()
        })
    })
})