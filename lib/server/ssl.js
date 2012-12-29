var fs = require('fs')
, path = require('path')

var serverName = process.env.NODE_ENV == 'prod' ? 'luckco.in' : 'localhost'

module.exports = {
    key: fs.readFileSync(path.join(__dirname, '../../other/' + serverName + '.key')),
    cert: fs.readFileSync(path.join(__dirname, '../../other/' + serverName + '.crt')),
}
