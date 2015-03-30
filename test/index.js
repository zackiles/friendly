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
    return Q.Promise(function(resolve, reject) {
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
    return Q.Promise(function(resolve, reject) {
      resolve(_.find(AUTHORS, {id: id}));
    });
  }
};
friendly.createModel(authorModel);

var publisherModel = {
  name: 'publisher',
  key: 'id',
  provider: function(id){
    return Q.Promise(function(resolve, reject) {
      resolve(_.find(PUBLISHERS, {id: id}));
    });
  }
};
friendly.createModel(publisherModel);

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

    it('should expand multiple types of children in one object', function(done){
      friendly.expand('book', BOOKS[3]).then(function(expandedObject){
        expandedObject.author.should.have.property('name', AUTHORS[1].name);
        expandedObject.publisher.should.have.property('name', PUBLISHERS[0].name);
        done();
      })
      .catch(done);
    });

    it('should expand a collection of objects with aliased foreign keys', function(done){
      friendly.expand('book', BOOKS[4]).then(function(expandedObject){
        console.log(expandedObject);
        expandedObject.authors[0].should.have.property('name', AUTHORS[0].name);
        expandedObject.authors[1].should.have.property('name', AUTHORS[1].name);
        done();
      })
      .catch(done);
    });

  });

  describe('#collapse()', function(){

    it('should collapse a single child object to just a key', function(done){
      friendly.expand('book', BOOKS[0]).then(function(expandedObject){
        var collapsed = friendly.collapse('book', expandedObject);
        collapsed.author.should.not.have.property('name');
        collapsed.author.should.have.property(authorModel.key, AUTHORS[0][authorModel.key]);
        done();
      })
      .catch(done);
    });

    it('should collapse multiple types of children in one object', function(done){
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

  });

});
