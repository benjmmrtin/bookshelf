var Promise   = global.testPromise;
var assert    = require('assert');
var equal     = assert.equal;
var _         = require('lodash');

module.exports = function() {
  var path     = require('path');
  var basePath = process.cwd();
  var CollectionBase = require(path.resolve(basePath + '/lib/base/collection'));
  var ModelBase      = require(path.resolve(basePath + '/lib/base/model'));

  describe('Collection', function() {
    var collection;
    var Collection = CollectionBase.extend({
      model: ModelBase.extend({
        tableName: 'test_table',
        idAttribute: 'some_id',
        invokedMethod: function() {
          return Promise.resolve(this.id);
        }
      })
    });

    beforeEach(function() {
      collection = new Collection([{some_id: 1, name: 'Test'}, {name: 'No Id'}]);
    });

    it('should have a tableName method that returns the tableName of the model', function() {
      equal(collection.tableName(), 'test_table');
    });

    it('should be iterable', function () {
      var models = []
      collection = new Collection([{some_id: 1}, {some_id: 2}]);
      for (var model of collection) {
        models.push(model)
      }
      equal(models.length, collection.length)
    })

    it('should have an idAttribute method, returning the idAttribute of the model', function() {
      equal(collection.idAttribute(), 'some_id');
    });

    it('should initialize the items passed to the constructor', function() {
      equal(collection.length, 2);
      equal(collection.at(0).id, 1);
      equal(collection.at(1).id, undefined);
    });

    describe('#add()', function() {
      it('adds new models to the collection', function() {
        var originalLength = collection.length;
        var newLength = collection.add({some_id: 3, name: 'Alice'}).length;
        expect(newLength).to.be.above(originalLength);
      })

      it('ignores duplicate models by default', function() {
        collection.add({some_id: 1, name: 'Not Test'});
        expect(collection.at(0).get('name')).to.equal('Test');
      })

      it('merges duplicate models when the merge option is set', function() {
        collection.add({some_id: 1, name: 'Not Test'}, {merge: true});
        expect(collection.at(0).get('name')).to.equal('Not Test');
      })

      it('Ignores the remove option when it\'s set to true', function() {
        collection.add({some_id: 1, name: 'Not Test'}, {remove: true});
        expect(collection.at(0).get('name')).to.equal('Test');
      })

      it('Ignores the add option when it\'s set to false and still adds new models', function() {
        var originalLength = collection.length;
        var newLength = collection.add({some_id: 3, name: 'Alice'}, {add: false}).length;
        expect(newLength).to.be.above(originalLength);
      })
    });

    describe('#set()', function() {
      it('should delete old models and add new ones by default', function() {
        collection.set([{some_id: 1, name: 'Test'}, {some_id: 2, name: 'Item'}]);
        equal(collection.length, 2);
        equal(collection.models.length, 2);
      });

      it('should not remove models with {remove: false} option set', function() {
        collection.set([{some_id: 2, name: 'Item2'}], {remove: false});
        equal(collection.length, 3);
      });

      it('should not merge new attribute values with {merge: false} option set', function() {
        collection.set([{some_id: 1, name: 'WontChange'}], {merge: false, parse: true});
        equal(collection.get(1).get('name'), 'Test');
      });

      it('should accept a single model, not an array', function() {
        collection.set({some_id: 1, name: 'Changed'});
        equal(collection.get(1).get('name'), 'Changed');
      });

      it('should accept Models', function() {
        var model = new collection.model({
          some_id: 3,
          name: 'Changed'
        });
        collection.set([model]);

        equal(collection.get(3).get('name'), 'Changed');
      });

      it('should not add models with {add: false} option set', function() {
        collection.set([{some_id: 3, name: 'WontAdd'}], {add: false});
        equal(collection.get(3), undefined);
      });

      it('should support large arrays', function() {
        this.timeout(120000);

        var count = 200000;
        var models = [];

        for (var i = 0; i < count; ++i) {
          models.push(new collection.model({some_id: i, name: 'Large-' + i}));
        }

        collection.set(models, {add: true, remove: false, merge: false});

        equal(collection.get(count - 1).get('name'), 'Large-' + (count - 1));
      });
    });

    it('should use the `reset` method, to reset the collection', function() {
      collection.reset([]);
      equal(collection.length, 0);
    });

    it('should use _prepareModel to prep model instances', function() {
      var model = new ModelBase({id: 1});
      expect(model).to.equal(collection._prepareModel(model));
      var newModel = collection._prepareModel({some_id: 1});
      assert.ok((newModel instanceof collection.model));
    });

    it('contains a mapThen method which calls map on the models and returns a when.all promise', function() {
      var spyIterator = sinon.spy(function(model) {
        return model.id;
      });

      return collection.mapThen(spyIterator).then(function(resp) {
        spyIterator.should.have.been.calledTwice;
        expect(_.compact(resp)).to.eql([1]);
      });
    });

    it('contains an invokeThen method which does an invoke on the models and returns a when.all promise', function() {
      return collection.invokeThen('invokedMethod').then(function(resp) {
        expect(_.compact(resp)).to.eql([1]);
      })
    });
  });
};
