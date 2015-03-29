# Friendly ORM

Make relationships, link data, and build streams with plain old javascript objects. A no-frills ORM without database drivers.

## Installation

You know the drill.

```sh
$ npm install friendly
```

## Overview

Only two methods EXPAND and COLLAPSE. Both methods work on a single parent object or an array of parent objects with nested children. A child property can be a foreign key, an object with a foreign key, or an array of either.

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

First configure your models for later use. Configuration takes a name, provider, key, and a child name/array of child names.

- A key the foreign key, or property name used to resolve a unique object.
- A provider is simply a function that returns a promise that resolves the object given a single paramater specified by the key.

So given a Book model that has an id property, with a nested author child, or method call would look like this:

``` js
var friendly = require('friendly');

friendly.createModel({
  name: 'book',
  key: 'id',
  children: 'author', // or ['author', 'category']
  provider: function(id){
    // return a promise that finds the book
    return findBooksPromise(id);
  }
});
```
