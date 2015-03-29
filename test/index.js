var should = require('should'),
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
  provider: function(id){
    return _.where(BOOKS, {id: id});
  }
};
var authorModel = {
  name: 'author',
  key: 'id',
  provider: function(id){
    return _.where(AUTHORS, {id: id});
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

});
