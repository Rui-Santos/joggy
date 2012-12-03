var expect = require('expect.js')
, Chat = require('../../lib/server/chat');

function mockClient() {
    var c =  {
        message: null,
        messages: [],
        socket: {
            id: '1',
            emit: function(n, m) {
                var message = { name: n, message: m };
                c.messages.push(message);
                c.message = message;
            },
            on: function() {
            },
            removeListener: function() {
            }
        }
    };

    return c;
}

describe('server', function() {
    describe('chat', function() {
        describe('addClient', function() {
            it('requires client parameter', function() {
                var chat = new Chat();

                expect(function() {
                    chat.addClient();
                }).to.throwError();
            });

            it('adds client to clients list', function() {
                var chat = new Chat();
                var client = mockClient();
                chat.addClient(client);

                expect(chat.clients.length).to.be(1);
            });

            it('doesnt allow adding the same client twice', function() {
                var chat = new Chat();
                var client = mockClient();
                chat.addClient(client);
                expect(function() {
                    chat.addClient(client);
                }).to.throwError();
            });
        });

        describe('removeClient', function() {
            it('doesnt allow removing null client', function( ){
                var chat = new Chat();
                expect(function() {
                    chat.removeClient(null);
                }).to.throwError();
            });

            it('doesnt allow removing non existing client', function() {
                var chat = new Chat();
                expect(function() {
                    chat.removeClient({});
                }).to.throwError();
            });

            it('allows removing clients', function() {
                var chat = new Chat();
                var client = mockClient();
                chat.addClient(client);
                chat.removeClient(client);

                expect(function() {
                    chat.removeClient(client);
                }).to.throwError();
            });
        });
    });
});