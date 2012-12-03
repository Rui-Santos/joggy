var expect = require('expect.js')
, Player = require('../../lib/models/Player');

describe('Models', function() {
    describe('Player', function() {
        it('has id-attribute _id', function() {
            var target = new Player({ _id: 123 });
            expect(target.id).to.be(123);
        });

        it('has defaults', function() {
            var target = new Player();
            expect(target.attributes.balance).to.be(null);
        });

        it('has a public profile', function() {
            var target = new Player({
                name: 'herbert',
                _id: 567,
                balance: 28
            });

            var actual = target.profile();

            expect(actual['name']).to.eql('herbert');
            expect(actual['_id']).to.eql(567);
            expect(actual['balance']).to.be(undefined);
        });
    });
});