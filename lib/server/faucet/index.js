var debug = require('debug')('joggy:faucet')
, _ = require('underscore')
, util = require('util')
, chat = require('../chat')
, EventEmitter = require('events').EventEmitter
, db = require('../app.db')
, Faucet = function() {
    this.interval = 1000 * 60 * 10
    this.answer = null
    this.timer = null
    this.timeToAnswer = 120 * 1000
    this.reward = 10e5
    this.user = 'sprinkles'

    chat.on('chat', this.onChatChat.bind(this))

    this.queueNext()
};

util.inherits(Faucet, EventEmitter);

_.extend(Faucet.prototype, {
    queueNext: function() {
        var interval = this.interval + Math.random() * 1000 * 120 - (1000 * 60)
        this.timer = setTimeout(this.quiz.bind(this), interval)
    },

    quiz: function() {
        var self = this

        debug('quiz time!')

        if (!chat.clients.length) {
            debug('there are no clients to answer the quiz')
            return self.queueNext()
        }

        debug('popping a question')

        // pop question
        db.get('faucet.questions').findOne({}, function(err, question) {
            if (err) {
                console.error(err)
                return self.queueNext()
            }

            if (!question) {
                console.error('unable to quiz (empty db)')
                return self.queueNext()
            }

            debug('removing question ' + question._id)

            db.get('faucet.questions').remove({ _id: question._id }, function(err, removed) {
                if (err) {
                    console.error(err)
                    return self.queueNext()
                }

                if (!removed) {
                    console.error('failed to remove question', removed)
                    return self.queueNext()
                }

                self.answer = question.a
                debug('answer is ' + self.answer)

                chat.broadcast({ user: self.user, text: '!!! QUIZ FOR ' + (self.reward / 1e5) + ' CREDIT !!! ' + question.q })

                // failure to answer in time
                setTimeout(function() {
                    if (!self.answer) return
                    chat.broadcast({
                        user: self.user,
                        text: '!!! QUIZ FAIL !!! no one guessed ' + self.answer + ' :-( lets try again in 10 min-ish?'
                    })
                    self.answer = null
                    self.queueNext()
                }, self.timeToAnswer)
            })
        })
    },

    onChatChat: function(message) {
        var self = this

        if (!self.answer) return
        if (message.text.toLowerCase() != self.answer.toLowerCase()) return

        var text = util.format('!!! WINNER !!! %s wins %d CREDITS with %s', message.client.user.get('username'), self.reward / 1e5, self.answer)

        chat.broadcast({ user: self.user, text: text })

        self.answer = null

        message.client.give(self.reward, function(err) {
            if (err) console.error('failed to give money from quiz', err)
            chat.broadcast({ user: self.user, text: 'lets have a new quiz in... 10 min?' })
            self.queueNext()
        })
    }
})

module.exports = new Faucet()