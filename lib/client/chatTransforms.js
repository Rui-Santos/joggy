var replaces = {
    badWords: {
        expression: /(fucker|fuck|shit|dick|cunt)/g,
        replace: function() {
            var alternatives = ['flower', 'smile', 'love', 'happy']
            return alternatives[Math.floor(Math.random() * alternatives.length)]
        }

    },

    smile: {
        expression: /:-?D|(:-\)|:\)|:o\)|:\]|:3|:c\)|:\>|=\]|8\)|=\)|:\}|:\^\))/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/smile.png" />'
        }
    },

    ambivalent: {
        expression: /(:-?\|)/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/ambivalent.png" />'
        }
    },

    kiss: {
        expression: /(x{3,})/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/kiss.png" />'
        }
    },

    angry: {
        expression: /(:-\|\||:\@)/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/angry.png" />'
        }
    },

    confused: {
        expression: /(#-\)|%-\)|%\))/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/confused.png" />'
        }
    },

    cool: {
        expression: /(\|;-\)|\|-O)/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/cool.png" />'
        }
    },

    wink: {
        expression: /(;-\)|;\)|\*-\)|\*\)|;-\]|;\]|;D|;\^\)|:-,\))/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/wink.png" />'
        }
    },

    embarassed: {
        expression: /(:\$)/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/embarassed.png" />'
        }
    },

    heart: {
        expression: /&lt;3/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/heart.png" />'
        }
    },

    thumbsup: {
        expression: /\+1/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/thumbsup.png" />'
        }
    },

    thumbsdown: {
        expression: /\-1/g,
        replace: function() {
            return '<img alt="$1" src="/media/emotes/thumbsdown.png" />'
        }
    }
}

module.exports = function(s) {
    _.each(replaces, function(r, k) {
        var result = _.result(r, 'replace')
        console.log('running replacer ' + k + '(' + result + ')')
        s = s.replace(r.expression, result)
    })

    return s
}