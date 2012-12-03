var Backbone = require('backbone')
, expect = require('expect.js')
, GameView = require('../../../lib/client/views/GameView');

describe('GameView', function() {
    describe('initialize', function() {
        it('assigns the class name', function() {
            var target = new GameView();
            expect(cv.$el.hasClass('game')).to.be(true);
        });

        it('has five card views', function() {
            var target = new GameView;
            expect(target.cards).to.be.an('array');
            expect(target.cards).to.have.length(5);
        });

        it('has hold buttons', function() {
            var target = new GameView;
            expect(target.$hold).to.have.length(5);
        });

        it('has current coin size ', function() {
            var target = new GameView;
            expect(target.$hold).to.have.length(5);
        });
    });

    describe('render', function() {
        it('should return instance', function() {
            var target = new GameView();
            expect(cv.render()).to.be(cv);
        });
    });
});