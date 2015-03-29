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
    name: 'Code Complete 3',
    author: {
      id: 19237
    }
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

    it('should fail creating a model without proper configuratione', function(done){
      (function(){friendly.createModel({children: []});}).should.throw();
      done();
    });

  });

  describe('#expand()', function(){

    it('should expand a single object', function(done){
      friendly.createModel(bookModel);
      friendly.createModel(authorModel);
      friendly.expand('book', BOOKS[0]).then(function(expandedObject){
        console.log(expandedObject);
        expandedObject.author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

    it('should expand an array of children keys', function(done){
      friendly.createModel(bookModel);
      friendly.createModel(authorModel);

      var models = [ BOOKS[0], BOOKS[1] ];

      friendly.expand('book', models).then(function(expandedObjects){
        expandedObjects[0].author.should.have.property('name', AUTHORS[0].name);
        expandedObjects[1].author.should.have.property('name', AUTHORS[0].name);
        done();
      })
      .catch(done);
    });

  });

});
