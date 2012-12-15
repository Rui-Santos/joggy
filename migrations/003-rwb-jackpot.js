db.machines.remove({ game: 'rwb' })
db.jackpots.insert({ _id: 'rwb', current: 10000 * 1e5, seed: 8100 * 1e5 })
