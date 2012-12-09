require('crypto-browserify')
, Backbone = require('backbone')
Backbone.setDomLibrary(jQuery)

var app = require('../../../../lib/client/app')
app.user = new Backbone.Model({
    credits: 1000
})

var RwbMachineModel = require('../../../../lib/models/RwbMachine')

var RwbMachineView = require('../../../../lib/client/views/RwbMachineView')
, model = new RwbMachineModel({

})
, machine = new RwbMachineView({
    model: model
})

machine.rect(0, 0, 500, 500)

$('#container').append(machine.$el)
