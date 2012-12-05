var db = require('./app.db')
, debug = require('debug')('joggy:db:sync')

module.exports = function(method, model, options) {
    options || (options = {});

    if (method === 'read') {
        db.get(model.urlRoot).findOne({
            _id: model.id
        }, function(err, doc) {
            if (err || !doc) return options.error ? options.error(err || new Error('not found')) : console.log('uncaught sync fail', err, doc);
            model.set(doc);
            options.success && options.success(model);
        })
    } else if (method === 'update') {
        debug('model json ' + JSON.stringify(model.toJSON(), null, 4))

        var j = _.omit(model.toJSON(), '_id')

        j = JSON.parse(JSON.stringify(j))

        db.get(model.urlRoot).update({
            _id: model.id
        }, {
            $set: j
        }, function(err) {
            if (err) {
                if  (options.error) return options.error(err)
                throw err
            }

            debug('sync complete')

            options.success && options.success(null, null, null)
        })
    } else {
        throw new Error('unsupported method ' + method)
    }
}