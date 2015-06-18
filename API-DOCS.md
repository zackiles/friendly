#API METHODS

## createModel(config)

Takes a configuration object with the following options. Any property not listed optional is required.

### Options

#### name
Type: `String`

The name of the model. This name is used for further calls toe expand & collapse, and is also used to identify the object when nested in a child.

#### aliases
Type: `String or String Array`
Optional

Extra names this object may appear as when used as a child. E.G., the model book may be aliased as books when appearing as a child in a 'library' model. Dot notation can also be used to represent this item found when nested in other objects, like 'bookCollection.book'.

#### provider
Type: `Function`

A function which takes the value of the foreign key (usually an id) and returns the full document from it's source. This function must return a promise that resolves the document.

#### key
Type: `Function`

The foreign key used to uniquely identify your model. In most cases this is 'id'. This property should be present in all instances of a model.

#### children
Type: `String or String Array`

Children are the names of models that might appear as children of this model. When the children name might be an alias, only set the children models real name, and instead add aliases to the other models configuration. Dot notation can also be used to represent deep nested children, like 'bookCollection.book'.

#### collapsables
Type: `String or String Array`

These are names of properties that will still be included even when this model is collapsed as a child. By default, all properties of children are collapsed except the property specified by key. Dot notation can also be used to represent items to collapse that are found when nested in other objects, like 'bookCollection.book'.
