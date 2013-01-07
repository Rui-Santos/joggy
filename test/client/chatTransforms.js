var chatTransforms = require('../../lib/client/chatTransforms')
, expect = require('expect.js')

describe('chatTransforms', function() {
    it('transforms smiley face', function() {
        var input = ':-)'
        , output = chatTransforms(input)

        expect(output).to.not.eql(input)
    })
})
