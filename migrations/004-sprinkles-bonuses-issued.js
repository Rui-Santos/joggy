// welcome bonus
db.users.find({ receivedWelcomeBonus: true }).forEach(function(user) {
    db.sprinkles.bonuses.issued.insert({
        bonus: 'welcome bonus',
        timestamp: +new Date(),
        user: user._id
    });
});

db.users.update({ }, { $unset: { receivedWelcomeBonus: 1 } }, { multi: true });

// xmas bonus
db.users.find({ receivedXmasBonus: true }).forEach(function(user) {
    db.sprinkles.bonuses.issued.insert({
        bonus: 'xmas bonus',
        timestamp: +new Date(),
        user: user._id
    });
});

db.users.update({ }, { $unset: { receivedXmasBonus: 1 } }, { multi: true });
