var services = require('../services')
, User = require('./User')

function Admin() {
    services.on('addClient', this.addClient.bind(this))
}

Admin.prototype.noBonus = function(client, packet) {
    if (!packet.username || !packet.username.length) {
        return client.socket.emit('error', 'username missing')
    }

    if (!packet.value || (packet.value !== 'on' && packet.value !== 'off')) {
        return client.socket.emit('error', 'value should be "on" or "off"')
    }

    var value = packet.value === 'on' ? true : false
    , loggedIn = _.find(services.site.clients, function(c) {
        return c.user && c.user.model.get('username') === packet.username
    })

    if (loggedIn) {
        loggedIn.user.model.set('noBonus', value)
    }

    // todo: PATCH
    services.db.collection('users').update({
        username: packet.username
    }, {
        $set: {
            noBonus: value
        }
    }, function(err, updates) {
        if (err) {
            console.error(err)
            client.socket.emit('error', 'failed to update')
            return
        }

        if (!updates) {
            client.socket.emit('error', 'user not found')
            return
        }

        services.site.chat.private({
            from: 'system',
            to: client.user,
            message: 'noBonus set to ' + value + ' for ' + packet.username
        })
    })
}

Admin.prototype.addClient = function(client) {
    if (!client.user) return
    if (!client.user.model.get('admin')) return
    client.socket.on('admin:nobonus', this.noBonus.bind(this, client))
}

module.exports = Admin
