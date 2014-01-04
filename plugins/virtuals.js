module.exports = function (Bookshelf) {
  "use strict";
  var Backbone  = require('backbone');
  var _         = require('lodash');
  var proto     = Bookshelf.Model.prototype;

  var Model = Bookshelf.Model.extend({
    // If virtual properties have been defined they will be created
    // as simple getters on the model during `initialize`
    initialize: function (attributes, options) {

      // always call the proto initialize function,
      // in case another plugin added something
      proto.initialize.apply(this, arguments);

      var virtuals = this.virtuals;
      if (_.isObject(virtuals)) {
        for(var func in virtuals) {
          Object.defineProperty(this, func, {
            enumerable: true,
            get: virtuals[func],
          });
        }
      }
    },

    // Passing `{virtuals: true}` or `{virtuals: false}` in the `options`
    // controls including virtuals on function-level and overrides the
    // model-level setting
    toJSON: function (options) {
      var attrs = proto.toJSON.call(this, options);

      var includeVirtuals = this.outputVirtuals;
      var includeVirtualsOpts = options && options.virtuals;

      includeVirtuals = (includeVirtuals && includeVirtuals === true);
      includeVirtualsOpts = _.isBoolean(includeVirtualsOpts) ? includeVirtualsOpts : includeVirtuals;

      if (includeVirtuals && includeVirtualsOpts) {
        var virtuals = this.virtuals;
        if (_.isObject(virtuals)) {
          for(var func in virtuals) {
            attrs[func] = virtuals[func].call(this);
          }
        }
      }

      return attrs;
    },

    // Allow virtuals to be fetched like normal properties
    get: function(attr) {
      var virtuals = this.virtuals;
      if (virtuals[attr]) {
        return virtuals[attr].call(this);
      }

      return Backbone.Model.prototype.get.apply(this, arguments);
    },
  });

  Bookshelf.Model = Model;
};
