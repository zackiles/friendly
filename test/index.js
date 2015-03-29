var should = require('should'),
    Q = require('q'),
    friendly = require('../index.js'),
    _ = require('lodash');


var BOOKS = [
  {
    id: 1,
    name: 'Code Complete 2',
    author: 19237
  }
];
var AUTHORS = [
  {
    id: 19237,
    name: 'Steve McConnel'
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
var authorModel = {
  name: 'author',
  key: 'id',
  provider: function(id){
    return Q.Promise(function(resolve, reject) {
      resolve(_.find(AUTHORS, {id: id}));
    });
  }
};

describe('Models', function(){

  describe('#createModel()', function(){

    it('should create a model', function(done){
      friendly.createModel(bookModel);
      var model = friendly.getModel(bookModel.name);
      model.should.have.property('name', bookModel.name);
      done();
    });

    it('should fail creating a model without a name', function(done){
      (function(){friendly.createModel({children: []});}).should.throw();
      done();
    });
    it('should fail creating a model without a provider', function(done){
      (function(){friendly.createModel({name: 'Book'});}).should.throw();
      done();
    });
  });

  describe('#expand()', function(){

    it('should expand a single object', function(done){
      friendly.createModel(bookModel);
      friendly.createModel(authorModel);
      friendly.expand('book', BOOKS[0]).then(function(expandedObject){
        expandedObject.author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

    it('should expand an array of objects', function(done){
      friendly.createModel(bookModel);
      friendly.createModel(authorModel);

      var models = [ BOOKS[0], BOOKS[0] ];

      friendly.expand('book', models).then(function(expandedObjects){
        expandedObjects[0].author.should.have.property('name', AUTHORS[0].name);
        expandedObjects[1].author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

  });

});
