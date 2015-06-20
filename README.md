# Friendly ORM
[![npm version](https://badge.fury.io/js/friendly.svg)](http://badge.fury.io/js/friendly)

Make relationships, link data, and build streams with plain old javascript objects. A no-frills ORM without database drivers.

## Installation

You know the drill.

```sh
$ npm install friendly
```

## Use Case

- You have documents with one-to-many or one-to-one relationships coming from different databases or sources and would like to quickly compose complete objects.
- You'd like to keep your code clean and have seperation of concerns between your services.
- You don't have the ability to do database joins or link documents.
- You want to avoid using bloated database specific ORM's.
- You want to add the ability to expand and collapse resources on your API or services.

## Overview

For full documentation see the [API DCOS](https://github.com/zackiles/friendly/blob/master/API-DOCS.md).

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
- collapsables (optional) => An array of property names to include from this object when this object is included as a child and the parent object calls the 'collapse' method. By default the property specified by 'key' is always included, and all other properties are removed.

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
  */
  var collapsedBook = friendly.expand('book', expandedBook);
  console.log(collapsedBook);
  /** prints
    {
      id: '203',
      name: 'Code Complete 2',
      author: '19237'
    }
  */
});
```

### How many ways can I represent a child object?

5 ways. Pay attention to how the author object changes in these examples. These are assuming you've created both a book and author model, and the author models key is set to 'id'.

``` js

// #1 - author as a primitive value
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
// #3 - multiple authors as an array of primitive values
var book = {
  id: '203',
  name: 'Code Complete 2',
  author: ['19237', '2462']
};
// #4 - multiple authors as an object array of objects
  id: '203',
  name: 'Code Complete 2',
  author: [
    { id: '19237' },
    { id: '2462' },
  ]
};
// #5 - author in a an unknown nested property.
// This allows you to call methods with dot notation like 'randomObject.author'
// (see 'What about deep nested children?' below)
  id: '203',
  name: 'Code Complete 2',
  randomObject: {
    name: 'something',
    author: [
      { id: '19237' },
      { id: '2462' }
    ]
  }
};
```
### How many ways can I call a model name?
2 ways.

- Call it by the name you set in it's model (case insensitive).
- Call it by one of it's aliases, so 'book' can be called by 'books' or 'bookCollection' if you have those as aliases (case insensitive).


### What about deep nested children?

Expand/Collapse accepts an optional 'path' as it's third argument. Dot notation can also be used - so instead of calling something like ***friendly.expand('mymodel')*** you can call ***friendly.expand('outer.mymodel')*** instead.

``` js
var object = {
  inner: {
    book: {
      name: 'Code Complete 2',
      author: '19237'
    }
  }
};

friendly.expand('book', object, 'inner.book').then(function(expandedBook){
  console.log(expandedBook);
  /** prints
    {
      inner: {
        book: {
          name: 'Code Complete 2',
          author: {
            id: '19237',
            name: 'Steve McConnel'
          }
        }
      }
    }
  */
});

```


### Gotcha's

- If at any time a child object can't be resolved during the expand method, it will just be skipped without warnings or errors.
- When passing an array of parent objects to expand, the first time a child is resolved it is cached incase another object in the array also uses the same child. The cache only lasts per call to expand, but this may provide unintended effects if a document changes during the call to expand 99% of the time this won't be an issue at all.
- There is no deep recursion to child objects. That is, if the child object also contains it's own children then will not be resolved. To accomplish this, you can manually add an expand call to your child's provider.
- Friendly is currently global and createModel can only be called once per model name per application instance.
- Collapsing will always transform the child into a single object with the foreign key property, and any optional collapsables you've set.
