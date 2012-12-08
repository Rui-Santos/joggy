// specify machine type
db.machines.update({}, { $set: { type: 'job' } }, { multi: true })

// rename jackpot
db.machines.update({ jackpot: 'site' }, { $set: { jackpot: 'job' } }, { multi: true })

var jp = db.jackpots.findOne({ _id: 'site' })
jp._id = 'job'
db.jackpots.insert(jp)
db.jackpots.remove({ _id: 'site' })
