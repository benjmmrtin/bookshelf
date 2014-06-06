var expect = require('chai').expect;
var sinon  = require('sinon');

module.exports = function(Bookshelf) {

	describe('Model Registry', function() {

		before(function() {
			this.hasOne = sinon.spy(Bookshelf.Model.prototype, 'hasOne');
			this.morphTo = sinon.spy(Bookshelf.Model.prototype, 'morphTo');
		});

		after(function() {
			this.hasOne.restore();
			this.morphTo.restore();
		});

		beforeEach(function () {
			this.hasOne.reset();
			this.morphTo.reset();
		});

		before(function() {
			Bookshelf.plugin('registry');
		});

		describe('Registering Models', function() {

			beforeEach(function() {
				Bookshelf._models = {};
				this.Model = Bookshelf.Model.extend({
					tableName: 'records'
				});
				this.model = Bookshelf.model('Model', this.Model);
			});

			it('returns the registered model', function() {
				expect(this.model).to.equal(this.Model);
			});

			it('assigns the model the name', function() {
				expect(Bookshelf.model('Model')).to.equal(this.Model);
			});

			it('throws when there is a name conflict', function() {
				expect(Bookshelf.model.bind(Bookshelf, 'Model', Bookshelf.Model)).to.throw();
			});

		});

		describe('Registering Collections', function() {

			beforeEach(function() {
				Bookshelf._collections = {};
				this.Collection = Bookshelf.Collection.extend({
					property: {}
				});
				this.collection = Bookshelf.collection('Collection', this.Collection);
			});

			it('returns the registered collection', function() {
				expect(this.collection).to.equal(this.Collection);
			});

			it('gives the collection a name', function() {
				expect(Bookshelf.collection('Collection')).to.equal(this.Collection);
			});

			it('throws when there is a name conflict', function() {
				expect(Bookshelf.collection.bind(Bookshelf, 'Collection', Bookshelf.Collection)).to.throw();
			});

		});

		describe('Custom Relations', function() {

			beforeEach(function() {
				var related = this.relatedModel = Bookshelf.model('Related', Bookshelf.Model.extend({
					tableName: 'related'
				}));
				this.relatedCollection = Bookshelf.collection('CRelated', Bookshelf.Collection.extend({
					property: {}
				}));
				var Model = Bookshelf.Model.extend({
					_hasOne: function() {
						return this.hasOne('Related');
					},
					_normalHasOne: function() {
						return this.hasOne(related);
					},
					_hasMany: function() {
						return this.hasMany('CRelated');
					},
					_morphTo: function() {
						return this.morphTo('morphable', 'Related', 'Related');
					},
					throughTest: function() {
						return this.hasMany('CRelated').through('Related');
					}
				});
				this.model = new Model();
			});

			afterEach(function () {
				delete Bookshelf._models;
				delete Bookshelf._collections;
			});

			it('resolves a string name to a model', function() {
				expect(this.model._hasOne().relatedData.target).to.equal(this.relatedModel);
			});

			it('falls back to a collection if no model is found', function() {
				expect(this.model._hasMany().relatedData.target).to.equal(this.relatedCollection);
			});

			it('can still accept a model constructor', function() {
				expect(this.model._normalHasOne().relatedData.target).to.equal(this.relatedModel);
			});

			it('applies the resolved model to the original method', function() {
				this.model._hasOne();
				expect(this.hasOne).to.have.been.calledWith(this.relatedModel);
			});

			it('allows for *-through relations', function() {
				var relation = this.model.throughTest();
				expect(relation.relatedData.throughTableName).to.equal('related');
			});

			describe('morphTo', function() {

				it('resolves all arguments', function() {
					// Wrap in a try/catch because Bookshelf actually
					// evalautes morph targets and we don't care that the
					// target is not a valid morph model

					try {
						this.model._morphTo();
					} catch (e) {
						expect(this.morphTo).to.have.been.calledWith('morphable', this.relatedModel, this.relatedModel);
					}
				});

			});

		});
	});
};