var Backbone = require('backbone')
, expect = require('expect.js')
, CardView = require('../../../lib/client/views/CardView');

describe('CardView', function() {
    describe('initialize', function() {
        it('should assign class name', function() {
            var cv = new CardView({ model: new Backbone.Model({ value: 10 }) });
            expect(cv.$el.hasClass('card')).to.be(true);
        });
    });

    describe('render', function() {
        it('should return instance', function() {
            var cv = new CardView({ model: new Backbone.Model({ value: 5 })});
            expect(cv.render()).to.be(cv);
        });

        it('should contain the card', function() {
            var cv = new CardView({ model: new Backbone.Model({ value: 13 * 0 + 12 }) });
            cv.render();
            expect(cv.$el.html().match(/qs/)).to.be.ok();

            cv = new CardView({ model: new Backbone.Model({ value: 0 }) });
            cv.render();
            expect(cv.$el.html().match(/back/)).to.be.ok();
        });
    });
});