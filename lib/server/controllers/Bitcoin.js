var debug = require('debug')('joggy:bitcoin')
, services = require('../services')
, Q = require('q')
, util = require('util')
, minConf = 0
, EventEmitter = require('events').EventEmitter
, BitcoinClient = require('bitcoin').Client
, _ = require('underscore')

function Bitcoin() {
    BitcoinClient.call(this, services.config.BTC)
    EventEmitter.call(this)

    var self = this
    , timer
    , loop = function() {
        self.processNewBlocks().then(function(r) {
            if (r) return loop()

            debug('scheduling next loop')
            timer = setTimeout(loop, 10 * 1000)
        }).done()
    }

    loop()

    process.on('exit', function() {
        timer && clearTimeout(timer)
    })
}

_.extend(Bitcoin.prototype, BitcoinClient.prototype, EventEmitter.prototype)

Bitcoin.prototype.processOutput = function(o, txid) {
    var self = this

    if (!o.scriptPubKey) throw new Error('scriptPubKey missing')

    if (!o.scriptPubKey.addresses) {
        debug('addresses missing from output ' + util.inspect(o.scriptPubKey));
        return 'skipped'
    }

    if (o.scriptPubKey.addresses.length !== 1) {
        throw new Error(o.scriptPubKey.addresses.length + ' addresses')
    }

    var address = o.scriptPubKey.addresses[0]
    , satoshi = o.value * 1e8
    , options = {
        query: { tx: { $ne: txid }, address: address },
        update: { $inc: { balance: satoshi }, $push: { tx: txid } },
        'new': true
    }

    return Q.ninvoke(services.db.get('users'), 'findAndModify', options).then(function(user) {
        if (!user) {
            //debug('external address or duplicate txid')
            return null
        }

        debug(util.format('user %s credited with %d, new balance is %d (tx %s)', user._id, o.value, user.balance / 1e8, txid))

        self.emit('credit', user._id, satoshi)

        return user._id
    })
}

Bitcoin.prototype.processTx = function(txid) {
    var self = this
    //debug('processing tx ' + txid)
    return Q.ninvoke(self, 'getRawTransaction', txid)
    .then(function(raw) {
        //debug('analyzing tx ' + txid)
        return Q.ninvoke(self, 'decodeRawTransaction', raw)
    })
    .get('vout')
    .then(function(outs) {
        return Q.spread(outs.map(function(o) {
            return Q.fcall(self.processOutput.bind(self), o, txid)
        }), function() { })
    })
}

Bitcoin.prototype.analyzeBlock = function(block) {
    var self = this
    debug('analyzing block')
    return Q.spread(block.tx.map(function(id) {
        return Q.fcall(self.processTx.bind(self), id)
    }), function() { })
}

Bitcoin.prototype.processNewBlocks = function() {
    var self = this
    debug('processing new blocks')

    return Q.all([
        Q.ninvoke(services.db.get('bitcoin.blocks'), 'findOne', { }, { sort: { height: -1 } }),
        Q.ninvoke(self, 'getBlockCount')
    ]).then(function(heights) {
        var lastHeight = heights[0] ? heights[0].height : 210740
        , nextHeight = lastHeight + 1
        debug('heights: internal=' + lastHeight + '; network=' + heights[1])

        if (heights[1] <= lastHeight + minConf) return null
        debug('analyzing block at height ' + nextHeight)

        return Q.ninvoke(self, 'getBlockHash', nextHeight)
        .then(function(hash) {
            debug('analyzing block with hash ' + hash)

            return Q.ninvoke(self, 'getBlock', hash)
            .then(self.analyzeBlock.bind(self))
            .then(function() {
                return Q.ninvoke(services.db.get('bitcoin.blocks'), 'insert', {
                    _id: hash,
                    height: nextHeight
                })
            })
        })
    })
    .fail(function(err) {
        console.error(err)
        console.error(err.stack)
    })
}

module.exports = Bitcoin
