function emoticon(name) {
    return '<img alt="$1" title="$1" src="/media/emotes/' + encodeURIComponent(name) + '.png" />'
}

var replaces = {
    badWords: {
        expression: /(fucker|fuck|shit|dick|cunt)/g,
        replace: function() {
            var alternatives = ['flower', 'smile', 'love', 'happy', 'smiles', 'hugs', 'kisses']
            return alternatives[Math.floor(Math.random() * alternatives.length)]
        }

    },

    smile: {
        expression: /(?:^|\s)(:-?D+|:-?\)+|:o\)+|:\]+|:c\)+|:\>+|\=\]+|8\)+|=\)+|:\}+|&#61;\)+|:\^\)+)/g,
        replace: function() {
            return emoticon('smile')
        }
    },

    ambivalent: {
        expression: /(?:^|\s)(:-?\|)/g,
        replace: function() {
            return emoticon('ambivalent')
        }
    },

    kiss: {
        expression: /(?:^|\s)(x{3,})/g,
        replace: function() {
            return emoticon('kiss')
        }
    },

    cry: {
        expression: /(?:^|\s)(:'-\(|:'\(|QQ|qq)/g,
        replace: function() {
            return emoticon('cry')
        }
    },

    moneymouth: {
        expression: /(?:^|\s)(\${3,})/g,
        replace: function() {
            return emoticon('moneymouth')
        }
    },

    angry: {
        expression: /(?:^|\s)(:-\|\||:\@)/g,
        replace: function() {
            return emoticon('angry')
        }
    },

    confused: {
        expression: /(?:^|\s)(#-\)|%-\)|%\))/g,
        replace: function() {
            return emoticon('confused')
        }
    },

    cool: {
        expression: /(?:^|\s)(\|;-\)|\|-O)/g,
        replace: function() {
            return emoticon('cool')
        }
    },

    wink: {
        expression: /(?:^|\s)(;-\)|;\)|\*-\)|\*\)|;-\]|;\]|;D|;\^\)|:-,\))/g,
        replace: function() {
            return emoticon('wink')
        }
    },

    frown: {
        expression: /(?:^|\s)(:-?[\(\{\[]|:-?&lt;)/g,
        replace: function() {
            return emoticon('frown')
        }
    },

    embarassed: {
        expression: /(?:^|\s)(:\$)/g,
        replace: function() {
            return emoticon('embarassed')
        }
    },

    heart: {
        expression: /(?:^|\s)(&lt;3)/g,
        replace: function() {
            return emoticon('heart')
        }
    },

    thumbsup: {
        expression: /(\+1|n1)/g,
        replace: function() {
            return emoticon('thumbsup')
        }
    },

    thumbsdown: {
        expression: /(?:^|\s)(\-1)/g,
        replace: function() {
            return emoticon('thumbsdown')
        }
    }
}

module.exports = function(s) {
    _.each(replaces, function(r, k) {
        var result = _.result(r, 'replace')
        s = s.replace(r.expression, result)
    })

    return s
}