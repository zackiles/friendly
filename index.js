'use strict';

var Promise = require('bluebird'),
    _ = require('lodash');

var MODELS = {};

function CacheBucket(){
  this.list = {};
}

CacheBucket.prototype.add = function(index, key, data){
  var cached = this.get(index, key);
  if(cached) return;
  if(!this.list[index]) this.list[index] = [];
  this.list[index].push({ key: key, data: data});
};

CacheBucket.prototype.get = function(index, key){
  if(!this.list[index]) return null;
  return _.find(this.list[index], {key: key});
};

function getModel(name){
  if(!name || !_.isString(name)) throw Error('A model name was not provided.');

  // check for dot-notation names like 'outer.inner' where 'inner' is the model name
  if(_.includes(name, '.')){
    var nameKeys = name.split('.');
    name = nameKeys[nameKeys.length -1];
    if(!name) throw Error('Model name ' + name + ' is invalid. Remove trailing period.');
  }

  var model = MODELS[name];
  var foundAs = name;

  // if a model wasn't found by name, then check for matching aliases as well
  if(!model) {
    _.forEach(MODELS, function(m){
      if(_.indexOf(m.aliases, name) > -1) {
        foundAs = name;
        model = m;
      }
    });
  }

  if(!model) throw Error('A model with that name has not been configured.');

  return {
    model: model,
    foundAs: foundAs
  };
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

function expandMany(modelName, data){
  return new Promise(function(resolve, reject) {

    // create a per instance cache bucket so we don't call the provider
    // for the same object multiple times. could cause issues if this
    // data is later used to write with, but relatively low chance.
    var cacheBucket = new CacheBucket();

    var promises = _.map(data, function(d){
      return expand(modelName, d, cacheBucket);
    });

    Promise.all(promises).spread(function(){
      resolve(Array.prototype.slice.call(arguments));
    }, reject);

  });
}

function expand(modelName, modelData, cacheBucket){
  if(!modelName) return Promise.reject(Error('No model name was provided to expand.'));
  if(!modelData) return Promise.reject(Error('No data was provided to expand.'));
  // we can pass an array or a single object
  if( _.isArray(modelData) ) return expandMany(modelName, modelData);

  var data = _.cloneDeep(modelData);
  var modelObj = getModel(modelName);
  var childrenKeys = getChildrenKeys(modelObj.model);

  _.forEach(childrenKeys, function(key){
    var child = getChildByKey(data, key);
      if(child){

        var childModelObj = getModel(key);
        var childProviderPromise;

        if(_.isArray(child)){
          //console.log('the child is an array for', modelName);
          childProviderPromise = Promise.all(child.map(function(c){
            return getProviderPromise(childModelObj.model, c, cacheBucket);
          }))
          .spread(function(){
            return Array.prototype.slice.call(arguments);
          });

        }else{
          childProviderPromise = getProviderPromise(childModelObj.model, child, cacheBucket);
        }

        data = replacePropertyByKey(data, childModelObj.foundAs, childProviderPromise);
      }
  });

  return Promise.props(data);
}

function collapseMany(modelName, modelData){
  return _.map(modelData, function(i){
    return collapse(modelName, i);
  });
}

function collapse(modelName, modelData){
  if(!modelName) throw Error('No model name was provided to expand.');
  if(!modelData) throw Error('No data was provided to expand.');
  // we can pass an array or a single object
  if( _.isArray(modelData) ) return collapseMany(modelName, modelData);

  var data = _.cloneDeep(modelData);
  var modelObj = getModel(modelName);
  var childrenKeys = getChildrenKeys(modelObj.model);

  _.forEach(childrenKeys, function(key){

    var child = getChildByKey(data, key);
      if(child){
        var childModelObj = getModel(key);
        var collapsedProperties = [childModelObj.model.key];

        // default is to always add the model key property, and then any
        // user configured collapsables for this child model.
        if(childModelObj.model.collapsables.length) collapsedProperties = collapsedProperties.concat(childModelObj.model.collapsables);

        if( _.isArray(child) ){
          var childArray = [];
          _.forEach(child, function(c){
            childArray.push(_.pick(c, collapsedProperties));
          });
          data = replacePropertyByKey(data, childModelObj.foundAs, childArray);
        }else{
          data = replacePropertyByKey(data, childModelObj.foundAs, _.pick(child, collapsedProperties));
        }
      }
  });

  return data;
}

function getProviderPromise(model, child, cacheBucket){
  return new Promise(function(resolve, reject) {
    var childProviderKeyValue = _.isObject(child) ? child[model.key] : child;
    getModelProviderByKeyValue(model, childProviderKeyValue, cacheBucket)
    .then(function(results){
      resolve(results);
    }).catch(function(err){
      // just skip over resolve failures.
      console.error(err);
      resolve(child);
    });
  });
}

function getModelProviderByKeyValue(model, keyValue, cacheBucket){
  if(cacheBucket){
    var cachedItem = cacheBucket.get(model.name, keyValue);
    return cachedItem ? Promise.resolve(cachedItem) : model.provider(keyValue);
  }else{
    return model.provider(keyValue);
  }
}

function getChildrenKeys(model){
  var children = [];
  children = children.concat(model.children);

  // look up any aliases the children might use
  _.forEach(model.children, function(child){
    var childModel = getModel(child).model;
    children = children.concat(childModel.aliases);
  });

  return children;
}

function replacePropertyByKey(obj, key, replace) {
  // allows dot notation like 'inner.outer'
  key = key.replace(/\[(\w+)\]/g, '.$1');
  key = key.replace(/^\./, '');
  var a = key.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in obj) {
        obj[k] = replace;
    }
  }
  return obj;
}

function getChildByKey(obj, key) {
  // allows dot notation like 'inner.outer'
  key = key.replace(/\[(\w+)\]/g, '.$1');
  key = key.replace(/^\./, '');
  var a = key.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in obj) {
      obj = obj[k];
    } else {
      return;
    }
  }
  return obj;
}

module.exports = {
  createModel: createModel,
  getModel: getModel,
  expand: expand,
  collapse: collapse
};
