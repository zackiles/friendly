# Friendly ORM
[![npm version](https://badge.fury.io/js/friendly.svg)](http://badge.fury.io/js/friendly)

A no-frills ORM that wraps your data. Make relationships, link data, and build streams with plain old javascript objects.

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

### Overview

First configure your models for later use. Configuration takes a name, provider, children, and optional collapsables.

- name => The name of your model. This is also the property name of the object when nested as a child object in a parent.
- key => (optional) the name of a property in this object that is unique, such as 'id'. This will be passed as the argument to your provider during expansion. If no key is configured, then the full object is passed to the provider.
- children (optional) => The model names of any children that might be nested in this model. If the childs model name is different than the property name it might be appear as, such as the model 'book' appearing as 'books', then configure 'books' as an alias in the 'book' model.
- provider => Is a promise returning function which is passed the key (or full object if no key is configured). The provider is called when this model appears as a child in another object and must be expanded.
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

4 ways. Pay attention to how the author object changes in these examples. These are assuming you've created both a book and author model, and the author models key is set to 'id'.

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

```

### What about models where I don't want to set a key?

- When calling ***expand*** on a parent object, if it's children don't have keys set for their model, then the entire object will be passed to the provider.
- When calling ***collapse*** on a parent object, if it's children models don't have keys AND collapsables set, then the child will be skipped and left untouched.


### What about deep nested children?

Expand/Collapse accepts an optional 'path' as it's third argument. Dot notation can also be used. This is essentially a utility function.

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

- During calls to expand, if a childs provider fails to resolve then the child will be skipped.
- There is no deep recursion to child objects. That is, if the child object also contains it's own children then will not be resolved. To accomplish this, you can manually add an expand call to your child's provider.
- Friendly is currently global and createModel can only be called once per model name per application instance.
