# Friendly ORM

Make relationships, link data, and build streams with plain old javascript objects. A no-frills ORM without database drivers.

## Installation

You know the drill.

```sh
$ npm install friendly
```

## Overview

Two primary methods, EXPAND and COLLAPSE. Both methods work on a single parent object or an array of parent objects with nested children. A child property can be a foreign key, an object with a foreign key, or an array of either.

- Expand => Like the mongoose 'populate' method. Will resolve nested children to their sources and map in a full or partial object.
- Collapse => Reduces a parent objects children into a minimal representation. Default is just the foreign key, but you can configure it to add any other properties you'd like.

### What does it look like?

It looks as easy as it sounds. Convert something like this.

``` js
Book: {
  id: 120,
  name: 'Code Complete 2',
  author: 19237
}
```

Into this...
``` js
Book: {
  id: 120,
  name: 'Code Complete 2',
  author: {
    id: 19237,
    name: 'Steve McConnel'
  }
}
```

### Examples?

First configure your models for later use. Configuration takes a name, provider, children, and optional collapsables.

- name => The name of your model. This is also the property name of the object when nested as a child object in a parent.
- key => Is the foreign key, or property name used to resolve a unique object. Any instances of this object a s achild or parent must contain this property.
- children (optional) => Is an array or a single name of a model.
- provider => Is a function which is passed the foreign key, which returns a promise that resolves the full child object.
- collapsables (optional) => An array of property names to include from this object when this object is included as a child and the parent object calls the 'collapse' method. By default the property specified by 'key' is always included', and all other properties are removed.

So given a Book model that has an id property with a nested author child, our configure method call would look like this:

``` js
var friendly = require('friendly');

friendly.createModel({
  name: 'book',
  key: 'id',
  collapsables: 'title', // or ['title', 'publishedDate']
  children: 'author', // or ['author', 'category']
  provider: function(id){
    // return a promise that finds the book
    return findBooksByIdPromise(id);
  }
});
```

Putting it all together and expanding/collapsing our book with authors would look like this:

``` js
var friendly = require('friendly');

friendly.createModel({
  name: 'book',
  key: 'id',
  children: 'author',
  provider: function(id){
    // return a promise that finds the book
    return findAuthorsByIdPromise(id);
  }
});

friendly.createModel({
  name: 'author',
  key: 'id',
  provider: function(id){
    // return a promise that finds the author
    return findBooksByIdPromise(id);
  }
});

var exampleAuthor = {
  id: '19237',
  name: 'Steve McConnel'
};

var exampleBook = {
  id: '203',
  name: 'Code Complete 2',
  author: '19237'
};


friendly.expand('book', exampleBook).then(function(expandedBook){
  console.log(expandedBook);
  /** prints
    {
      id: '203',
      name: 'Code Complete 2',
      author: {
        id: '19237',
        name: 'Steve McConnel'
      }
    }
  /*
  var collapsedBook = friendly.expand('book', expandedBook);
  console.log(collapsedBook);
  /** prints
    {
      id: '203',
      name: 'Code Complete 2',
      author: '19237'
    }
  /*
});
```

### How many ways can I represent a child object?

4 ways. Pay attention to how the author object changes in these examples

``` js

// #1 - author as a value
var book = {
  id: '203',
  name: 'Code Complete 2',
  author: '19237'
};
// #2 - author as an object
var book = {
  id: '203',
  name: 'Code Complete 2',
  author: {
    id: '19237'
  }
};
// #3 - multiple authors as an array
var book = {
  id: '203',
  name: 'Code Complete 2',
  author: ['19237', '2462']
};
// #4 - multiple authors as an object array
var book = {
  id: '203',
  name: 'Code Complete 2',
  author: [
    { id: '19237' },
    { id: '2462' },
  ]
};

```
