var _ = require('underscore')
, debug = require('debug')('config')
, fs = require('fs');

var config = module.exports = {
    io: {
        
    }
};

_.extend(config, require('./' + (process.env.NODE_ENV || 'local')));
