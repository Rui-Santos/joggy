var debug = require('debug')('joggy:sprinkles')
, _ = require('underscore')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, services = require('../services')

function Sprinkles() {
    var self = this

    self.interval = 1000 * 60 * 10
    self.answer = null
    self.timer = null
    self.timeToAnswer = 120 * 1000
    self.reward = 10e5
    self.user = 'sprinkles'

    services.site.chat.on('chat', self.onChatChat.bind(self))
    services.site.chat.on('join', self.onChatJoin.bind(self))
    services.on('jackpotWon', self.onSiteJackpotWon.bind(self))
    services.on('bigWin', self.onSiteBigWin.bind(self))

    self.queueNext()
}

util.inherits(Sprinkles, EventEmitter)

Sprinkles.prototype.queueNext = function() {
    var interval = this.interval + Math.random() * 1000 * 120 - (1000 * 60)
    this.timer = setTimeout(this.quiz.bind(this), interval)
}

Sprinkles.prototype.onSiteJackpotWon = function(user, amount) {
    this.broadcast(util.format(
        'everyone congratulate %s with WINNING THE JACKPOT! %d CREDITS!!!',
        user.model.get('username'),
        amount / 1e5))
}

Sprinkles.prototype.onSiteBigWin = function(user, what, amount) {
    this.broadcast(util.format(
        '%s got a %s worth %d CREDITS!!',
        user.model.get('username'),
        what,
        amount / 1e5))
}

Sprinkles.prototype.broadcast = function(message) {
    services.site.chat.broadcast({ user: this.user, text: message })
}

Sprinkles.prototype.onChatJoin = function(user) {
    var greetings = [
        'welcome to the game %s!',
        'welcome %s... good luck :)',
        'everyone say hi to %s!',
        'hello and good luck %s!',
    ]
    , greeting = greetings[Math.floor(Math.random() * greetings.length)]

    this.broadcast(util.format(greeting, user.model.get('username')))
}

Sprinkles.prototype.quiz = function() {
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

Sprinkles.prototype.onChatChat = function(message) {
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

module.exports = Sprinkles
