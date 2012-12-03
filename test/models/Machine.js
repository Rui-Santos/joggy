var expect = require('expect.js')
, Machine = require('../../lib/models/Machine');

describe('Models', function() {
    describe('Machine', function() {
        it('has id-attribute _id', function() {
            var target = new Machine({ _id: 234 });
            expect(target.id).to.be(234);
        });

        it('has defaults', function() {
            var target = new Machine();
            expect(target.attributes.state).to.be(null);
            expect(target.attributes.jackpot).to.be(null);
        });
    });
});