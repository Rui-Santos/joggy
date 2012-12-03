var expect = require('expect.js')
, io = require('socket.io')
, Machine = require('../../lib/server/Machine');

describe('Server', function() {
    describe('Machine', function() {
        it('exists', function() {
            expect(Machine).to.be.ok();
            var machine = new Machine;
            expect(machine).to.be.ok();
        });
    });
});