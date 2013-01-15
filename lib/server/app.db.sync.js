var services = require('./services')
, debug = require('debug')('joggy:db:sync')

module.exports = function(method, model, options) {
    options || (options = {})
    var coll = services.db.collection(model.urlRoot)

    if (method === 'read') {
        coll.findOne({
            _id: coll.id(model.id)
        }, function(err, doc) {
            if (err) {
                if  (options.error) return options.error(err)
                throw err
            }

            if (!doc) {
                if (options.error) return options.err(new Error('document not found'))
                throw new Error('document not found')
            }

            model.set(doc)
            options.success && options.success(model)
        })
    } else if (method === 'update') {
        var j = _.omit(model.toJSON(), '_id')

        j = JSON.parse(JSON.stringify(j))

        coll.update({
            _id: coll.id(model.id)
        }, {
            $set: j
        }, function(err) {
            if (err) {
                if  (options.error) return options.error(err)
                throw err
            }

            options.success && options.success(null, null, null)
        })
    } else if (method === 'create') {
        var j = model.toJSON()

        j = JSON.parse(JSON.stringify(j))

        coll.insert(j, function(err, doc) {
            if (err) {
                if  (options.error) return options.error(err)
                throw err
            }

            model.set('_id', j._id.toString())

            if (!model.id) {
                console.error(doc)
                throw new Error('failed to obtained _id after create')
            }

            options.success && options.success(null, null, null)
        })
    } else {
        throw new Error('unsupported method ' + method)
    }
}