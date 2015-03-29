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
