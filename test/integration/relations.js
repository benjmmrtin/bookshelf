var when      = require('when');
var equal     = require('assert').equal;

module.exports = function(Bookshelf) {

  describe('Relations', function() {

    var objs        = require('./helpers/objects')(Bookshelf);
    var Relation    = objs.Relation;
    var Models      = objs.Models;
    var Collections = objs.Collections;

    // Models
    var Site     = Models.Site;
    var SiteMeta = Models.SiteMeta;
    var Admin    = Models.Admin;
    var Author   = Models.Author;
    var Blog     = Models.Blog;
    var Post     = Models.Post;
    var Comment  = Models.Comment;
    var Tag      = Models.Tag;
    var User     = Models.User;
    var Role     = Models.Role;
    var Photo    = Models.Photo;

    // Collections
    var Sites    = Collections.Sites;
    var Admins   = Collections.Admins;
    var Blogs    = Collections.Blogs;
    var Posts    = Collections.Posts;
    var Comments = Collections.Comment;
    var Photos   = Collections.Photos;
    var Authors  = Collections.Authors;

    describe('Bookshelf Relations', function() {

      describe('Standard Relations - Models', function() {

        it('handles belongsTo (blog, site)', function() {
          return new Blog({id: 4})
            .fetch()
            .then(function(model) {
              return model.site().fetch({log: true});
            });
        });

        it('handles hasMany (posts)', function() {
          return new Blog({id: 1})
            .fetch()
            .then(function(model) {
              return model.posts().fetch({log: true});
            });
        });

        it('handles hasOne (meta)', function() {
          return new Site({id: 1})
            .meta()
            .fetch({log: true});
        });

        it('handles belongsToMany (posts)', function() {
          return new Author({id: 1})
            .posts()
            .fetch({log: true});
        });

      });

      describe('Eager Loading - Models', function() {

        it('eager loads "hasOne" relationships correctly (site -> meta)', function() {
          return new Site({id: 1}).fetch({
            log: true,
            withRelated: ['meta']
          });
        });

        it('eager loads "hasMany" relationships correctly (site -> authors, blogs)', function() {
          return new Site({id: 1}).fetch({
            log: true,
            withRelated: ['authors', 'blogs']
          });
        });

        it('eager loads "belongsTo" relationships correctly (blog -> site)', function() {
          return new Blog({id: 3}).fetch({
            log: true,
            withRelated: ['site']
          });
        });

        // it('Throws an error if you try to fetch a related object without the necessary key', function() {
        //   return new Blog({id: 1}).site().fetch().should.be.rejected;
        // });

        it('eager loads "belongsToMany" models correctly (post -> tags)', function() {
          return new Post({id: 1}).fetch({
            log: true,
            withRelated: ['tags']
          });
        });

        it('Attaches an empty related model or collection if the `EagerRelation` comes back blank', function() {
          return new Site({id: 3}).fetch({
            log: true,
            withRelated: ['meta', 'blogs', 'authors.posts']
          });
        });

      });

      describe('Eager Loading - Collections', function() {

        it('eager loads "hasOne" models correctly (sites -> meta)', function() {
          return new Sites().fetch({
            log: true,
            withRelated: ['meta']
          });
        });

        it('eager loads "belongsTo" models correctly (blogs -> site)', function() {
          return new Blogs().fetch({
            log: true,
            withRelated: ['site']
          });
        });

        it('eager loads "hasMany" models correctly (site -> blogs)', function() {
          return new Site({id: 1}).fetch({
            log: true,
            withRelated: ['blogs']
          });
        });

        it('eager loads "belongsToMany" models correctly (posts -> tags)', function() {
          return new Posts()
            .query('where', 'blog_id', '=', 1)
            .fetch({
              log: true,
              withRelated: ['tags']
            });
        });

      });

      describe('Nested Eager Loading - Models', function() {

        it('eager loads "hasMany" -> "hasMany" (site -> authors.ownPosts)', function() {
          return new Site({id: 1}).fetch({
            log: true,
            withRelated: ['authors.ownPosts']
          });
        });

        it('eager loads "hasMany" -> "belongsToMany" (site -> authors.posts)', function() {
          return new Site({id: 1}).fetch({
            log: true,
            withRelated: ['authors.posts']
          });
        });

        it('does multi deep eager loads (site -> authors.ownPosts, authors.site, blogs.posts)', function() {
          return new Site({id: 1}).fetch({
            log: true,
            withRelated: ['authors.ownPosts', 'authors.site', 'blogs.posts']
          });
        });

      });

      describe('Nested Eager Loading - Collections', function() {

        it('eager loads "hasMany" -> "hasMany" (sites -> authors.ownPosts)', function() {
          return new Sites().fetch({
            log: true,
            withRelated: ['authors.ownPosts']
          });
        });

      });

      describe('Model & Collection - load', function() {

        it('eager loads relations on a populated model (site -> blogs, authors.site)', function() {
          return new Site({id: 1}).fetch({log: true}).then(function(m) {
            return m.load(['blogs', 'authors.site']);
          });
        });

        it('eager loads attributes on a collection (sites -> blogs, authors.site)', function() {
          return new Sites().fetch({log: true}).then(function(c) {
            return c.load(['blogs', 'authors.site']);
          });
        });
      });

      describe('Pivot Tables', function() {

        before(function() {
          return when.all([
            new Site({id: 1}).admins().detach(),
            new Site({id: 2}).admins().detach()
          ]);
        });

        it('provides "attach" for creating or attaching records', function() {

          var site1  = new Site({id: 1});
          var site2  = new Site({id: 2});
          var admin1 = new Admin({username: 'syncable', password: 'test'});
          var admin2 = new Admin({username: 'syncable', password: 'test'});
          var admin1_id;

          return when.all([admin1.save(), admin2.save()])
            .then(function() {
              admin1_id = admin1.id;
              return when.all([
                site1.related('admins').attach([admin1, admin2]),
                site2.related('admins').attach(admin2)
              ]);
            })
            .then(function(resp) {
              expect(site1.related('admins')).to.have.length(2);
              expect(site2.related('admins')).to.have.length(1);
            }).then(function() {
              return when.all([
                new Site({id: 1}).related('admins').fetch().then(function(c) {
                  c.each(function(m) {
                    equal(m.hasChanged(), false);
                  });
                  equal(c.at(0).pivot.get('item'), 'test');
                  equal(c.length, 2);
                }),
                new Site({id: 2}).related('admins').fetch().then(function(c) {
                  equal(c.length, 1);
                })
              ]);
            })
            .then(function(resp) {
              return when.all([
                new Site({id: 1}).related('admins').fetch(),
                new Site({id: 2}).related('admins').fetch()
              ]);
            })
            .spread(function(admins1, admins2) {
              return when.all([
                admins1.detach(admin1_id).then(function(c) {
                  expect(admins1).to.have.length(1);
                  return c.fetch();
                }).then(function(c) {
                  equal(c.length, 1);
                }),
                admins2.detach().then(function(c) {
                  expect(admins2).to.have.length(0);
                  return c.fetch();
                }).then(function(c) {
                  equal(c.length, 0);
                })
              ]);
            });
        });

      });

      describe('Custom foreignKey & otherKey', function() {

        it('works with many-to-many (user -> roles)', function() {
          return new User({uid: 1})
            .roles()
            .fetch({log: true});
        });

        it('works with eager loaded many-to-many (user -> roles)', function() {
          return new User({uid: 1})
            .fetch({log: true, withRelated: ['roles']});
        });

      });

      describe('Polymorphic associations', function() {

        it('handles morphOne (photo)', function() {
          return new Author({id: 1})
            .photo()
            .fetch({log: true});
        });

        it('handles morphMany (photo)', function() {
          return new Site({id: 1})
            .photos()
            .fetch({log: true});
        });

        it('handles morphTo (imageable "authors")', function() {
          return new Photo({imageable_id: 1, imageable_type: 'authors'})
            .imageable()
            .fetch({log: true});
        });

        it('handles morphTo (imageable "sites")', function() {
          return new Photo({imageable_id: 1, imageable_type: 'sites'})
            .imageable()
            .fetch({log: true});
        });

        it('eager loads morphMany (sites -> photos)', function() {
          return new Sites().fetch({log: true, withRelated: ['photos']});
        });

        it('eager loads morphTo (photos -> imageable)', function() {
          return new Photos().fetch({log: true, withRelated: ['imageable']});
        });

      });

      describe('`through` relations', function() {

        it('handles hasMany `through`', function() {
          return new Blog({id: 1}).comments().fetch({log: true});
        });

        it('eager loads hasMany `through`', function() {
          return new Blogs().query({where: {site_id: 1}}).fetch({
            log: true,
            withRelated: 'comments'
          });
        });

        it('handles hasOne `through`', function() {
          return new Site({id: 1}).info().fetch({log: true});
        });

        it('eager loads hasOne `through`', function() {
          return new Sites().query('where', 'id', '<', 3).fetch({
            log: true,
            withRelated: 'info'
          });
        });

        it('eager loads belongsToMany `through`', function() {
          return new Authors().fetch({log: true, withRelated: 'blogs'});
        });

      });

    });

  });

};