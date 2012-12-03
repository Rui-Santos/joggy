var expect = require('expect.js')
, Card = require('../../lib/models/Card');

describe('Models', function() {
    describe('Card', function() {
        it('exists', function() {
            expect(new Card).to.be.ok();
        });
    });
});