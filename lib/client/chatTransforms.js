function emoticon(name) {
    return '<img alt="$1" title="$1" src="/media/emotes/' + name + '.png" />'
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
        expression: /:-?D|(:-\)|:\)|:o\)|:\]|:3|:c\)|:\>|=\]|8\)|=\)|:\}|:\^\))/g,
        replace: function() {
            return emoticon('smile')
        }
    },

    ambivalent: {
        expression: /(:-?\|)/g,
        replace: function() {
            return emoticon('ambivalent')
        }
    },

    kiss: {
        expression: /(x{3,})/g,
        replace: function() {
            return emoticon('kiss')
        }
    },

    angry: {
        expression: /(:-\|\||:\@)/g,
        replace: function() {
            return emoticon('angry')
        }
    },

    confused: {
        expression: /(#-\)|%-\)|%\))/g,
        replace: function() {
            return emoticon('confused')
        }
    },

    cool: {
        expression: /(\|;-\)|\|-O)/g,
        replace: function() {
            return emoticon('cool')
        }
    },

    wink: {
        expression: /(;-\)|;\)|\*-\)|\*\)|;-\]|;\]|;D|;\^\)|:-,\))/g,
        replace: function() {
            return emoticon('wink')
        }
    },

    embarassed: {
        expression: /(:\$)/g,
        replace: function() {
            return emoticon('embarassed')
        }
    },

    heart: {
        expression: /&lt;3/g,
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
        expression: /\-1/g,
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