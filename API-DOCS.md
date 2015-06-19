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

Extra names this object may appear as when used as a child. E.G., the model book may be aliased as books when appearing as a child in a 'library' model.

#### provider
Type: `Function`

A function which takes the value of the foreign key (usually an id) and returns the full document from it's source. This function must return a promise that resolves the document.

#### key
Type: `Function`

The foreign key used to uniquely identify your model. In most cases this is 'id'. This property should be present in all instances of a model.

#### children
Type: `String or String Array`

Children are the names of models that might appear as children of this model. Only use the child models real name. When the property of the child is stored in is different than it's models name, make sure to add that name as an alias to the child model as well.

#### collapsables
Type: `String or String Array`

These are names of properties that will still be included even when this model is collapsed as a child. By default, all properties of children are collapsed except the property specified by key.
