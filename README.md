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

First configure your models for later use. Configuration takes a name, provider, children, and optional collapsables.

- key (optional default 'id') is the foreign key, or property name used to resolve a unique object. If a key is not used children properites must either be the key themselves, or equal an object which contains an 'id' property
- children is an array or single property name of the child object. The property value can be the foreign key itself, an array of foreign keys, or an object ontaining a property matching the property name supplied with 'key'.
- provider is a function which is passed the foreign key, which returns a promise that resolves the full child object.
- collapsables (optional) an array of property names to remove from this object when this object is included as a child and the parent object calls the 'collapse' method. By default the property specified by 'key' is always included'.

So given a Book model that has an id property with a nested author child, our configure method call would look like this:

``` js
var friendly = require('friendly');

friendly.createModel({
  name: 'book',
  key: 'id',
  collapsables: ['title', 'publishedDate'],
  children: 'author', // or ['author', 'category']
  provider: function(id){
    // return a promise that finds the book
    return findBooksByIdPromise(id);
  }
});
```
