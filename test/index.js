var should = require('should'),
    Q = require('q'),
    friendly = require('../index.js'),
    _ = require('lodash');


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

var bookModel = {
  name: 'book',
  key: 'id',
  children: 'author',
  provider: function(id){
    return Q.Promise(function(resolve, reject) {
      resolve(_.find(BOOKS, {id: id}));
    });
  }
};
friendly.createModel(bookModel);

var authorModel = {
  name: 'author',
  key: 'id',
  provider: function(id){
    return Q.Promise(function(resolve, reject) {
      resolve(_.find(AUTHORS, {id: id}));
    });
  }
};
friendly.createModel(authorModel);

describe('Models', function(){

  describe('#createModel()', function(){

    it('should create a model', function(done){
      var model = friendly.getModel(bookModel.name);
      model.should.have.property('name', bookModel.name);
      done();
    });

    it('should fail creating a model without proper configuratione', function(done){
      (function(){friendly.createModel({children: []});}).should.throw();
      done();
    });

  });

  describe('#expand()', function(){

    it('should expand a single object', function(done){
      friendly.expand('book', BOOKS[0]).then(function(expandedObject){
        expandedObject.author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

    it('should expand a collection of objects', function(done){
      var models = [ BOOKS[0], BOOKS[1] ];
      friendly.expand('book', models).then(function(expandedObjects){
        expandedObjects[0].author.should.have.property('name', AUTHORS[0].name);
        expandedObjects[1].author.should.have.property('name', AUTHORS[1].name);
        done();
      })
      .catch(done);
    });

    it('should expand an array of children keys', function(done){
      friendly.expand('book', BOOKS[2]).then(function(expandedObject){
        expandedObject.should.have.property('author').with.lengthOf(BOOKS[2].author.length);
        var author = _.find(AUTHORS, {id: expandedObject.author[0].id});
        if(!_.isObject(author)) return done(new Error('object is missing a matching child'));
        done();
      })
      .catch(done);
    });

  });

});
