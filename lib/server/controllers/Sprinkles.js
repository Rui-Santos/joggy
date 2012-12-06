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

    services.site.chat.on('chat', self.onChatQuizCheck.bind(self))
    services.site.chat.on('chat', self.onChatWelcomeBonusCheck.bind(self))
    services.site.chat.on('join', self.onChatJoin.bind(self))
    services.on('jackpotWon', self.onSiteJackpotWon.bind(self))
    services.on('bigWin', self.onSiteBigWin.bind(self))

    self.queueNext()
}

util.inherits(Sprinkles, EventEmitter)

Sprinkles.prototype.queueNext = function() {
    var variance = 8 * 60 * 1000
    , interval = this.interval + Math.random() * variance * 2 - variance
    this.timer = setTimeout(this.quiz.bind(this), interval)
    debug('next quiz will be in ' + (interval / 1000) + ' seconds')
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
    services.site.chat.broadcast({ from: this.user, message: message })
}

Sprinkles.prototype.private = function(to, message) {
    services.site.chat.private({ from: this.user, to: to, message: message })
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

    this.welcomeBonusCheck(user)

    this.private(user, 'oh and remember that theres a 10x play requirement on all bonuses/prizes from me')
}

Sprinkles.prototype.welcomeBonusCheck = function(user) {
    if (user.model.get('receivedWelcomeBonus')) {
        return
    }

    var text = util.format('hey there, %s! to get the 10 CREDIT welcome bonus, say welcome bonus in the chat. ' +
        'if you accept the welcome bonus, you need to play 100 CREDITS',
        user.model.get('username'))

    this.private(user, text)
}

Sprinkles.prototype.quiz = function() {
    var self = this

    debug('quiz time!')

    if (!services.site.chat.clients.length) {
        debug('there are no clients to answer the quiz')
        return self.queueNext()
    }

    debug('popping a question')

    // pop question
    services.db.get('faucet.questions').findOne({}, function(err, question) {
        if (err) {
            console.error(err)
            return self.queueNext()
        }

        if (!question) {
            console.error('unable to quiz (empty db)')
            return self.queueNext()
        }

        debug('removing question ' + question._id)

        services.db.get('faucet.questions').remove({ _id: question._id }, function(err, removed) {
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

            self.broadcast('!!! QUIZ FOR ' + (self.reward / 1e5) + ' CREDIT !!! ' + question.q)

            // failure to answer in time
            setTimeout(function() {
                if (!self.answer) return
                self.broadcast('!!! QUIZ FAIL !!! no one guessed ' + self.answer + ' :-( lets try again in 10 min-ish?')
                self.answer = null
                self.queueNext()
            }, self.timeToAnswer)
        })
    })
},

Sprinkles.prototype.onChatQuizCheck = function(packet) {
    var self = this

    if (!self.answer) return
    if (packet.message.toLowerCase() != self.answer.toLowerCase()) return

    var text = util.format(
        '!!! WINNER !!! %s wins %d CREDITS with %s',
        packet.client.user.model.get('username'),
        self.reward / 1e5,
        self.answer)

    this.broadcast(text)

    self.answer = null

    packet.client.user.bonus(self.reward, self.reward * 10, 'quiz reward', function(err) {
        if (err) console.error('failed to give bonus from quiz', err)
        self.broadcast('lets have a new quiz in... 10 min?')
        self.queueNext()
    })
}

Sprinkles.prototype.onChatWelcomeBonusCheck = function(packet) {
    var self = this

    if (packet.message != 'welcome bonus') {
        return
    }

    var user = packet.client.user

    if (user.model.get('receivedWelcomeBonus')) {
        return self.private(packet.client.user, 'you already received a welcome bonus!')
    }

    user.model.save({
        receivedWelcomeBonus: true
    }, {
        success: function() {
            user.bonus(10 * 1e5, 100 * 1e5, 'welcome bonus', function(err) {
                if (err) throw err
                self.private(user, 'you received a welcome bonus of 10 CREDITS - i hope you win!')
            })
        }
    })
}

module.exports = Sprinkles
