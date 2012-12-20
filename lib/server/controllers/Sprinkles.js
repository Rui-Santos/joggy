var debug = require('debug')('joggy:sprinkles')
, _ = require('underscore')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, services = require('../services')

function Sprinkles() {
    var self = this

    self.answer = null
    self.timer = null
    self.timeToAnswer = 120 * 1000
    self.reward = 10e5
    self.user = 'sprinkles'
    self.announceDelay = 1000 * 5

    services.site.chat.on('chat', self.onChatQuizCheck.bind(self))
    services.site.chat.on('chat', self.onChatWelcomeBonusCheck.bind(self))
    services.site.chat.on('chat', self.onChatXmasBonusCheck.bind(self))
    services.site.chat.on('join', self.onChatJoin.bind(self))
    services.on('jackpotWon', self.onSiteJackpotWon.bind(self))
    services.on('competitionWon', self.onSiteCompetitionWon.bind(self))
    services.on('kittyStart', self.onKittyStart.bind(self))
    services.on('kittyAnswer', self.onKittyAnswer.bind(self))
    services.on('win', self.onSiteWin.bind(self))
}

util.inherits(Sprinkles, EventEmitter)

Sprinkles.prototype.onSiteJackpotWon = function(user, amount) {
    var self = this

    setTimeout(function() {
        self.broadcast(util.format(
            'everyone congratulate %s with WINNING THE JACKPOT! %d CREDITS!!!',
            user.model.get('username'),
            amount / 1e5))
    }, self.announceDelay)
}

Sprinkles.prototype.onKittyAnswer = function(details) {
    var self = this

    var correctTexts = [
        '{username} nailed it at {time} +1',
        '{username} @ {time} +1',
        '{username} clocks in at {time} +1',
        '{time} from {username} +1',
        '{username} makes it at {time}! +1',
        '{username} clicks it at {time} +1'
    ]
    , wrongTexts = [
        '{username} just missed it -1',
        '{username} picked the wrong one at {time} -1',
        '{username} clicked the wrong one at {time} -1',
        '{username} missed! -1'
    ]
    , tooLateTexts = [
        '{username} was too late! -1',
        '{username} clicked too late! -1',
        '{username} clicked a little late -1'
    ]

    var texts = details.time === 0 ? tooLateTexts : details.correct ? correctTexts : wrongTexts
    , text = texts[Math.floor(Math.random() * texts.length)]
    text = text.replace('{username}', details.user.model.get('username'))
    text = text.replace('{time}', details.time)

    this.broadcast(text)
}

Sprinkles.prototype.onKittyStart = function() {
    var self = this

    var texts = [
        'LOOK UP! cmopetition is starting :)',
        'heads up, contest is starting',
        'lookup now ;)',
        'contest has started, look up!!',
        'competition time :) look up to win',
        'pay attention, contest underway!! +1',
        'LOOK UP!! ;)'
    ]
    , text = texts[Math.floor(Math.random() * texts.length)]

    this.broadcast(text)
}


Sprinkles.prototype.onSiteCompetitionWon = function(details) {
    var self = this

    var texts = [
        'grats to %s with %d CREDITS from %s',
        'woo! %s gets %d CREDITS from %s :)',
        'hoooray! :) %s wins %d CREDITS from %s',
        '+1 %s WINS %d CREDITS from %s',
        'prize goes to... %s! %d CREDITS from %s',
        'yay! %s won %d credits from %s!!!'
    ]
    , text = texts[Math.floor(Math.random() * texts.length)]

    self.broadcast(util.format(
        text,
        details.user.model.get('username'),
        details.credits,
        details.what))
}

Sprinkles.prototype.onSiteWin = function(details) {
    var self = this

    if (details.credits < 25) return

    setTimeout(function() {
        self.broadcast(util.format(
            '%s got %s on %s worth %d CREDITS!!',
            details.user.model.get('username'),
            details.what,
            details.machine.name,
            details.credits))
    }, self.announceDelay)
}

Sprinkles.prototype.broadcast = function(message) {
    services.site.chat.broadcast('chat', { from: this.user, message: message })
}

Sprinkles.prototype.private = function(to, message) {
    services.site.chat.private({ from: this.user, to: to, message: message })
}

Sprinkles.prototype.onChatJoin = function(user) {
    var greetings = [
        'welcome to the game %s!',
        'hi and good luck %s :)',
        'lets all say hi to %s :)',
        'lets welcome %s to the game!! +1',
        'welcome %s... good luck :)',
        'everyone say hi to %s!',
        'hello and good luck %s!',
    ]
    , greeting = greetings[Math.floor(Math.random() * greetings.length)]

    this.broadcast(util.format(greeting, user.model.get('username')))

    this.welcomeBonusCheck(user)
    this.xmasBonusCheck(user)

    this.private(user, 'oh and remember that theres a 10x play requirement on all bonuses/prizes!')
}

Sprinkles.prototype.welcomeBonusCheck = function(user) {
    if (user.model.get('receivedWelcomeBonus')) {
        return
    }

    var text = util.format('hey there, %s! to get the 10 CREDIT welcome bonus, say welcome bonus in the chat',
        user.model.get('username'))

    this.private(user, text)
}

Sprinkles.prototype.xmasBonusCheck = function(user) {
    if (user.model.get('receivedXmasBonus')) {
        return
    }

    var text = util.format('MERRY MAS %s! to get your gift, write <b>xmas bonus</b>',
        user.model.get('username'))

    this.private(user, text)
}

Sprinkles.prototype.startCompetition = function(cb) {
    var self = this
    this.competitionCallback = cb

    debug('quiz time!')

    if (!services.site.chat.userCount) {
        debug('there are no clients to answer the quiz')
        return cb()
    }

    debug('popping a question')

    // pop question
    services.db.get('faucet.questions').findOne({}, function(err, question) {
        if (err) {
            console.error(err)
            return self.competitionCallback()
        }

        if (!question) {
            console.error('unable to quiz (empty db)')
            return self.competitionCallback()
        }

        debug('removing question ' + question._id)

        services.db.get('faucet.questions').remove({ _id: question._id }, function(err, removed) {
            if (err) {
                console.error(err)
                return self.competitionCallback()
            }

            if (!removed) {
                console.error('failed to remove question', removed)
                return self.competitionCallback()
            }

            self.answer = question.a
            debug('answer is ' + self.answer)

            self.broadcast('!!! QUIZ FOR ' + (self.reward / 1e5) + ' CREDITS !!! ' + question.q)

            // failure to answer in time
            setTimeout(function() {
                if (!self.answer) return
                self.broadcast('!!! QUIZ FAIL !!! no one guessed ' + self.answer + ' :-( lets try again in 10 min-ish?')
                self.answer = null
                return self.competitionCallback()
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
        return self.competitionCallback()
    })
}

Sprinkles.prototype.onChatWelcomeBonusCheck = function(packet) {
    var self = this

    if (packet.message.toLowerCase() != 'welcome bonus') {
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

Sprinkles.prototype.onChatXmasBonusCheck = function(packet) {
    var self = this

    if (packet.message.toLowerCase() != 'xmas bonus') {
        return
    }

    var user = packet.client.user

    if (user.model.get('receivedXmasBonus')) {
        return self.private(packet.client.user, 'you already got your present, remember? :)')
    }

    user.model.save({
        receivedXmasBonus: true
    }, {
        success: function() {
            // values from -45 to +45 it seems
            var credits = ((Math.random() * 2 - 1) + (Math.random() * 2 - 1) + (Math.random() * 2 - 1)) * 15
            credits = Math.floor(credits)

            if (credits < 1) credits = 1

            user.bonus(credits * 1e5, 10 * credits * 1e5, 'xmas bonus', function(err) {
                if (err) throw err

                self.broadcast(util.format('merry xmas %s, here is... %d CREDITS! :)', user.model.get('username'), credits))
            })
        }
    })
}

module.exports = Sprinkles
