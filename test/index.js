var should = require('should'),
    Promise = require('bluebird'),
    friendly = require('../index.js'),
    _ = require('lodash');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var BOOKS = [
  {
    id: 1,
    name: 'Code Complete 2',
    author: 19237
  },
  {
    id: 2,
    name: 'John Does Biography',
    author: {
      id: 16030
    }
  },
  {
    id: 3,
    name: 'Multi Authored Book',
    author: [19237, 16030]
  },
  {
    id: 4,
    name: 'Book With Author & Publisher',
    author: {
      id: 16030
    },
    publisher: {
      id: 23687
    }
  },
  {
    id: 5,
    name: 'Book With Aliases Children',
    authors: [19237, 16030]
  }

];

var AUTHORS = [
  {
    id: 19237,
    name: 'Steve McConnel'
  },
  {
    id: 16030,
    name: 'John Doe'
  }
];

var PUBLISHERS = [
  {
    id: 23687,
    name: 'White House Publishing'
  },
  {
    id: 3456,
    name: 'Dream Factory Publishing'
  }
];

var bookModel = {
  name: 'book',
  key: 'id',
  children: ['author', 'publisher'],
  provider: function(id){
    return new Promise(function(resolve, reject) {
      resolve(_.find(BOOKS, {id: id}));
    });
  }
};
friendly.createModel(bookModel);

var authorModel = {
  name: 'author',
  key: 'id',
  aliases: ['authors'],
  provider: function(id){
    return new Promise(function(resolve, reject) {
      resolve(_.find(AUTHORS, {id: id}));
    });
  }
};
friendly.createModel(authorModel);

var publisherModel = {
  name: 'publisher',
  key: 'id',
  provider: function(id){
    return new Promise(function(resolve, reject) {
      resolve(_.find(PUBLISHERS, {id: id}));
    });
  }
};
friendly.createModel(publisherModel);

describe('Methods', function(){

  describe('#setConfig()', function(){
    it('updates the configuration', function(done){
      var config = {
        logErrors: false,
        logDebug: false
      };
      var results = friendly.setConfig(config);
      results.should.have.property('logErrors', false);
      results.should.have.property('logDebug', false);
      done();
    });
  });

  describe('#createModel()', function(){

    it('creates a model', function(done){
       var model = friendly.getModel(bookModel.name);
      model.should.have.property('name', bookModel.name);
      done();
    });

    it('model names are case insensitive', function(done){
      var model = friendly.getModel(bookModel.name.toUpperCase());
      model.should.have.property('name', bookModel.name);
      done();
    });

    it('model names is added to it\'s own aliases', function(done){
      var model = friendly.getModel(bookModel.name.toUpperCase());
      model.should.have.property('aliases');
      model.aliases.should.containEql(model.name);
      done();
    });

    it('creates a model without a key', function(done){
      var model = _.cloneDeep(bookModel);
      delete model.key
      model.name = 'modelwithnokey';
      friendly.createModel(model);
      var newModel = friendly.getModel(model.name);
      newModel.should.have.property('name', model.name);
      newModel.should.not.have.property('key');
      done();
    });

    it('fail creating a model without proper configuration', function(done){
      (function(){friendly.createModel({children: []});}).should.throw();
      done();
    });

    it('fail creating a model twice', function(done){
      (function(){
        friendly.createModel(publisherModel);
      }).should.throw();
      done();
    });

  });

  describe('#expand()', function(){

    it('expands an object', function(done){
      friendly.expand('book', BOOKS[0]).then(function(expandedObject){
        expandedObject.author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

    it('expands an object using an options object', function(done){
      friendly.expand({model: 'book', data: BOOKS[0]}).then(function(expandedObject){
        expandedObject.author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

    it('expands an array of objects', function(done){
      var models = [ BOOKS[0], BOOKS[1] ];
      friendly.expand('book', models).then(function(expandedObjects){
        expandedObjects[0].author.should.have.property('name', AUTHORS[0].name);
        expandedObjects[1].author.should.have.property('name', AUTHORS[1].name);
        done();
      })
      .catch(done);
    });

    it('expands an object with a key', function(done){
      friendly.createModel({
        name: 'store',
        children: 'employee',
        provider: function(){}
      });
      friendly.createModel({
        name: 'employee',
        provider: function(item){
          return new Promise(function(resolve, reject) {
            item.should.be.equal('24');
            resolve({name: 'Mike Smith'});
          });
        }
      });
      friendly.expand('store', {employee:'24'}).then(function(results){
        results.employee.should.have.property('name', 'Mike Smith');
        done();
      }).catch(done);
    });

    it('expands a nested object using a path argument', function(done){
      var object = {
        inner: {
          book : BOOKS[0]
        }
      };
      friendly.expand('book', object, 'inner.book').then(function(expandedObject){
        expandedObject.inner.book.should.have.property('name', BOOKS[0].name);
        done();
      })
      .catch(done);
    });

    it('expands a nested array of objects using a path argument', function(done){
      var object = {
        inner: {
          book : [BOOKS[0], BOOKS[1]]
        }
      };
      friendly.expand('book', object, 'inner.book').then(function(expandedObject){
        expandedObject.inner.book[0].should.have.property('name', BOOKS[0].name);
        expandedObject.inner.book[1].should.have.property('name', BOOKS[1].name);
        done();
      })
      .catch(done);
    });

    it('expands an array of children keys', function(done){
      friendly.expand('book', BOOKS[2]).then(function(expandedObject){
        expandedObject.should.have.property('author').with.lengthOf(BOOKS[2].author.length);
        var author = _.find(AUTHORS, {id: expandedObject.author[0].id});
        if(!_.isObject(author)) return done(new Error('object is missing a matching child'));
        done();
      })
      .catch(done);
    });

    it('expands multiple children in one object', function(done){
      friendly.expand('book', BOOKS[3]).then(function(expandedObject){
        expandedObject.author.should.have.property('name', AUTHORS[1].name);
        expandedObject.publisher.should.have.property('name', PUBLISHERS[0].name);
        done();
      })
      .catch(done);
    });

    it('expands an array of children with aliased keys', function(done){
      friendly.expand('book', BOOKS[4]).then(function(expandedObject){
        expandedObject.authors[0].should.have.property('name', AUTHORS[0].name);
        expandedObject.authors[1].should.have.property('name', AUTHORS[1].name);
        done();
      })
      .catch(done);
    });

  });

  describe('#collapse()', function(){

    it('collapses a single child object', function(done){
      friendly.expand('book', BOOKS[0]).then(function(expandedObject){
        var collapsed = friendly.collapse('book', expandedObject);
        collapsed.author.should.not.have.property('name');
        collapsed.author.should.have.property(authorModel.key, AUTHORS[0][authorModel.key]);
        done();
      })
      .catch(done);
    });

    it('collapses with an options object a single child object', function(done){
      friendly.expand({model: 'book', data: BOOKS[0]}).then(function(expandedObject){
        var collapsed = friendly.collapse('book', expandedObject);
        collapsed.author.should.not.have.property('name');
        collapsed.author.should.have.property(authorModel.key, AUTHORS[0][authorModel.key]);
        done();
      })
      .catch(done);
    });

    it('collapses a nested object using a path argument', function(done){
      var book = BOOKS[0];
      book.author = AUTHORS[0];

      var object = {
        inner: {
          book : book
        }
      };
      var collapsed = friendly.collapse('book', object, 'inner.book');
      collapsed.inner.book.author.should.not.have.property('name');
      collapsed.inner.book.author.should.have.property(authorModel.key, AUTHORS[0][authorModel.key]);
      done();
    });

    it('collapses a nested array of objects using a path argument', function(done){
      var book1 = BOOKS[0];
      book1.author = AUTHORS[0];
      var book2 = BOOKS[1];
      book2.author = AUTHORS[1];

      var object = {
        inner: {
          books : [book1, book2]
        }
      };
      var collapsed = friendly.collapse('book', object, 'inner.books');
      collapsed.inner.books[0].author.should.not.have.property('name');
      collapsed.inner.books[0].author.should.have.property(authorModel.key, AUTHORS[0][authorModel.key]);
      collapsed.inner.books[1].author.should.not.have.property('name');
      collapsed.inner.books[1].author.should.have.property(authorModel.key, AUTHORS[1][authorModel.key]);
      done();
    });

    it('collapses multiple types of children in one object', function(done){
      friendly.expand('book', BOOKS[3]).then(function(expandedObject){
        var collapsed = friendly.collapse('book', expandedObject);
        collapsed.author.should.not.have.property('name');
        collapsed.author.should.have.property(authorModel.key, AUTHORS[1][authorModel.key]);
        collapsed.publisher.should.not.have.property('name');
        collapsed.publisher.should.have.property(publisherModel.key, PUBLISHERS[0][publisherModel.key]);
        done();
      })
      .catch(done);
    });

    it('collapses a collection of objects with aliased foreign keys', function(done){
      friendly.expand('book', BOOKS[4]).then(function(expandedObject){
        var collapsed = friendly.collapse('book', expandedObject);
        collapsed.authors[0].should.not.have.property('name', AUTHORS[0].name);
        collapsed.authors[1].should.not.have.property('name', AUTHORS[1].name);
        done();
      })
      .catch(done);
    });

    it('does not collapse a child that has no key or collapsables configured', function(done){
      friendly.createModel({
        name: 'ncParent',
        children: 'ncChild',
        provider: function(){}
      });
      friendly.createModel({
        name: 'ncChild',
        provider: function(item){}
      });
      var collapsed = friendly.collapse('ncParent', {
        name: 'ncparentStore',
        employee:{
          name: 'Bobby Hill',
          age: 29
        }
      });
      collapsed.employee.should.have.property('name', 'Bobby Hill');
      done();
    });
  });

});
