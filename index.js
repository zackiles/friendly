'use strict';

var CacheBucket = require('./cache-bucket'),
    dot = require('dot-object'),
    dotject = require("dotject"),
    Promise = require('bluebird'),
    _ = require('lodash');

var MODELS = {};

function logError(){
  var args = Array.prototype.slice.call(arguments);
  if(args[0] instanceof Error) args[0] = args[0].stack;
  args = args.join(' ');
  console.error('[friendly] ERROR:', args);
}

function log(){
  if(process.env.NODE_ENV === 'development'){
    console.log('[friendly] INFO:', Array.prototype.slice.call(arguments).join(' '));
  }
}

function getModel(name){
  if(!name || !_.isString(name)) throw Error('A model name was not provided.');

  var model = MODELS[name.toLowerCase()];

  // if a model wasn't found by name, then check for matching aliases as well
  if(!model) {
    _.forEach(MODELS, function(m){
      if(_.indexOf(m.aliases, name.toLowerCase()) > -1) {
        model = m;
      }
    });
  }

  if(!model) throw Error('Unable to find a matching model for: ' + name);

  return model;
}

function createModel(config){

  var sanitizeArray = function(arr, type){
    if( _.isArray(arr) ){
      _.forEach(arr, function(a){
        if( !_.isString(a) ) throw new Error(type + ' must be an array of strings.');
      });
      return _.uniq(arr);
    }else if( _.isString(arr) ){
      return _.uniq([arr]);
    }else{
      return [];
    }
  };
  if( !config.name ) throw Error('A model name was not provided.');
  config.name = config.name.toLowerCase();
  if( MODELS[config.name] ) throw Error('A model with this name already exists.');
  if( !config.provider ) throw Error('A model provider was not provided.');
  if( !config.key ) throw Error('A model key was not provided.');
  if( !_.isFunction(config.provider) ) throw Error('A model provider must be a function.');

  MODELS[config.name] = {
    name: config.name,
    provider: config.provider,
    children: sanitizeArray(config.children, 'children'),
    key: config.key,
    aliases: sanitizeArray(config.aliases, 'aliases'),
    collapsables: sanitizeArray(config.collapsables, 'collapsables')
  };

}

function expandMany(modelName, modelData, path){
  log('The data passed was an array, recursively resolving for model:', modelName);
  // create a per instance cache bucket so we don't call the provider
  // for the same object multiple times. could cause issues if this
  // data is later used to write with, but relatively low chance.
  var cacheBucket = new CacheBucket(),
      data = path ? dot.pick(path, modelData) : _.cloneDeep(modelData);

  var promises = _.map(data, function(d){
    return expand(modelName, d, null, cacheBucket);
  });

  return Promise.all(promises).spread(function(){
    var results = Array.prototype.slice.call(arguments);
    if(path){
      var stub = _.cloneDeep(modelData);
      return replaceChildByKey(stub, path, results);
    }else{
      return results;
    }
  });
}

function expand(modelName, modelData, path, cacheBucket){
  if(!modelName) throw Error('No model name was provided to expand.');
  if(!modelData) throw Error('No data was provided to expand.');

  var model = getModel(modelName),
      childrenKeys = getChildKeysByModel(model),
      data = path ? dot.pick(path, modelData) : _.cloneDeep(modelData);

  if(path){
    log('Expanding model:', model.name, 'at path:', path, 'with keys:', childrenKeys.join());
  }else{
    log('Expanding model:', model.name, 'with keys:', childrenKeys.join());
  }

  // we can pass an array or a single object.
  if( _.isArray(data) ) return expandMany(model.name, modelData, path);

  return Promise.map(childrenKeys, function(key){

    var child = path ? dot.pick(key, data) : data[key];
    if(!child) return;
    var childModel = getModel(key);

    log('Found child:', childModel.name, 'for parent model:', model.name, 'in child:', child);
    if(_.isArray(child)){
      return Promise.all(child.map(function(c){
        return getProviderPromise(childModel, c, cacheBucket);
      }))
      .spread(function(){
        var results = Array.prototype.slice.call(arguments);
        data = replaceChildByKey(data, key, results);
      });

    }else{
      return getProviderPromise(childModel, child, cacheBucket).then(function(results){
        data = replaceChildByKey(data, key, results);
      });
    }

  }, {concurrency: 1})
  .then(function(){
    if(path){
      return replaceChildByKey(modelData, path, data);
    }else{
      return data;
    }
  });
}

function collapseMany(modelName, modelData){
  return _.map(modelData, function(i){
    return collapse(modelName, i);
  });
}

function collapse(modelName, modelData, path){
  if(!modelName) throw Error('No model name was provided to expand.');
  if(!modelData) throw Error('No data was provided to expand.');
  // we can pass an array or a single object.
  if( _.isArray(modelData) ) return collapseMany(modelName, modelData);


  var model = getModel(modelName),
      childrenKeys = getChildKeysByModel(model),
      data;

  if(path){
    data = dot.pick(path, modelData);
    log('Expanding model:', model.name, 'at path:', path, 'with keys:', childrenKeys.join());
  }else{
    data =_.cloneDeep(modelData);
    log('Expanding model:', model.name, 'with keys:', childrenKeys.join());
  }
  _.forEach(childrenKeys, function(key){
    var child = dot.pick(key, data);
    if(child){

      var childModel = getModel(key),
          collapsedProperties = [childModel.key];

      log('Collapsing model:', modelName, 'with the following collapsables:', collapsedProperties.join());

      // default is to always add the model key property, and then any
      // user configured collapsables for this child model.
      if(childModel.collapsables.length) collapsedProperties = collapsedProperties.concat(childModel.collapsables);

      if( _.isArray(child) ){
        var childArray = [];
        _.forEach(child, function(c){
          childArray.push(_.pick(c, collapsedProperties));
        });
        data = replaceChildByKey(data, key, childArray);
      }else{
        data = replaceChildByKey(data, key, _.pick(child, collapsedProperties));
      }
    }
  });

  if(path){
    return replaceChildByKey(modelData, path, data);
  }else{
    return data;
  }
}

function getProviderPromise(model, child, cacheBucket){
  return new Promise(function(resolve, reject) {
    var childProviderKeyValue = _.isObject(child) ? child[model.key] : child;
    getModelProviderByKeyValue(model, childProviderKeyValue, cacheBucket)
    .then(function(results){
      if(cacheBucket) cacheBucket.add(model.name, childProviderKeyValue, results);
      resolve(results);
    }).catch(function(err){
      // just skip over resolve failures.
      logError(err);
      logError('Provider for model:', model.name, 'was unable to resolve an object for child:', child, 'Skiping child.');
      resolve(child);
    });
  });
}

function getModelProviderByKeyValue(model, keyValue, cacheBucket){
  if(cacheBucket){
    var cachedItem = cacheBucket.get(model.name, keyValue);
    if(cachedItem) {
      log('Object found in cache for:', model.name, 'using key:', model.key, 'and value:', keyValue);
      return Promise.resolve(cachedItem);
    }
  }
  log('Object not found in cache. Calling provider for model:', model.name, 'using key:', model.key, 'and value:', keyValue);
  return model.provider(keyValue);
}

function getChildKeysByModel(model){
  var children = [].concat(model.children);

  // look up any aliases the children might use.
  _.forEach(model.children, function(child){
    children = children.concat(getModel(child).aliases);
  });

  return children;
}

function replaceChildByKey(obj, key, replace) {
  dot.remove(key, obj);
  return dotject(key, obj, replace);
}

module.exports = {
  createModel: createModel,
  getModel: getModel,
  expand: expand,
  collapse: collapse
};
