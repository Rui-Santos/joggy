var io = require('socket.io')
, config = require('../../config')
, _ = require('underscore');

module.exports = {
    configure: function(server) {
        return io.listen(server, _.extend(config.io, { 'log level': 1 }));
    }
}