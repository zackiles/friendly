'use strict';

var Q = require('q'),
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
  if(!name || !_.isString(name)) throw new Error('a model name was not provided');
  var model = MODELS[name];
  // if a model wasn't found by name, then check for matching aliases as well
  if(!model) {
    _.forEach(MODELS, function(m){
      if(_.indexOf(m.aliases, name) > -1) model = m;
    });
  }
  if(!model) throw new Error('a model with that name does not exists');
  return model;
}

function createModel(config){

  var sanitizeArray = function(arr, type){
    if( _.isArray(arr) ){
      _.forEach(arr, function(a){
        if( !_.isString(a) ) throw new Error(type + ' must be an array of strings');
      });
      return _.uniq(arr);
    }else if( _.isString(arr) ){
      return _.uniq([arr]);
    }else{
      return [];
    }
  };

  if( !config.name ) throw new Error('a model name was not provided');
  if( MODELS[config.name] ) throw new Error('a model with this name already exists');
  if( !config.provider ) throw new Error('a model provider was not provided');
  if( !config.key ) throw new Error('a model key was not provided');
  if( !_.isFunction(config.provider) ) throw new Error('a model provider must be a function');

  MODELS[config.name] = {
    name: config.name,
    provider: config.provider,
    children: sanitizeArray(config.children, 'children'),
    key: config.key,
    aliases: sanitizeArray(config.aliases, 'aliases'),
    collapsables: sanitizeArray(config.collapsables, 'collapsables')
  };
}

function expandMany(model, data){
  return Q.Promise(function(resolve, reject) {

    // create a per instance cache bucket so we don't call the provider
    // for the same object multiple times. could cause issues if this
    // data is later used to write with, but relatively low chance.
    var cacheBucket = new CacheBucket();

    var promises = _.map(data, function(d){
      return expand(model.name, d, cacheBucket);
    });

    Q.all(promises).spread(function(){
      resolve(Array.prototype.slice.call(arguments));
    }, reject);

  });
}

function getChildren(model){
  var children = [];
  children = children.concat(model.children);

  // look up any aliases the children might use
  _.forEach(model.children, function(child){
    var childModel = getModel(child);
    children = children.concat(childModel.aliases);
  });

  return children;
}

function getKeyValue(model, item){
  return _.isObject(item) ? item[model.key] : item;
}

function getProviderFromKeyValue(model, keyValue, cacheBucket){
  var promise;
  if(cacheBucket){
    var cachedItem = cacheBucket.get(model.name, keyValue);
    promise = cachedItem ? Q.resolve(currentCache.data) : model.provider(keyValue);
  }else{
    promise = model.provider(keyValue);
  }
  return promise;
}

function expand(name, data, cacheBucket){
  return Q.Promise(function(resolve, reject) {

    var model = getModel(name);

    if(!data) return reject(new Error('no object was provided to expand'));
    data = _.cloneDeep(data);

    // we can pass an array of objects to expand or a single object
    if( _.isArray(data) ) return resolve(expandMany(model, data));

    var promises = [];
    var children = getChildren(model);

    _.forEach(children, function(prop){
      if(data.hasOwnProperty(prop)){

        var childModel = getModel(prop);
        var childKey = data[prop];

        if(childModel && childKey){
          // can resolve a single child or an array of children
          var childPromises = [];

          // is the child an array of children objects or a single object?
          if( _.isArray(childKey) ){

            data[prop] = [];
            // if its an array, then recursively fetch and map each inner child object
            _.forEach(childKey, function(innerChild){

              var foreignKeyValue = getKeyValue(model, innerChild);

              var promise = getProviderFromKeyValue(childModel, foreignKeyValue, cacheBucket).then(function(results){
                if(results){
                  if(cacheBucket) cacheBucket.add(childModel.name, foreignKeyValue, results);
                  data[prop].push(results);
                }
              });
              childPromises.push(promise);

            });
          }else{

            var foreignKeyValue = getKeyValue(model, childKey);
            var promise = getProviderFromKeyValue(childModel, foreignKeyValue, cacheBucket).then(function(results){
              if(results){
                if(cacheBucket) cacheBucket.add(childModel.name, foreignKeyValue, results);
                data[prop] = results;
              }
            });
            childPromises.push(promise);

          }

          if(childPromises.length) promises = promises.concat(childPromises);
        }

      }
    });

    if(!promises.length) return resolve(data);
    Q.all(promises).spread(function(){resolve(data);}, reject);

  });
}

function collapse(name, data){

  var model = getModel(name);

  if(!data) throw new Error('no object was provided to collapse');

  data = _.cloneDeep(data);
  var children = getChildren(model);

  _.forEach(children, function(child){
    if(data.hasOwnProperty(child)){
      var childModel = getModel(child);
      var collapsedProperties = [childModel.key];

      // default is to always add the model key property, and then any
      // user configured collapsables for this child model.
      if(childModel.collapsables.length) collapsedProperties = collapsedProperties.concat(childModel.collapsables);

      if( _.isArray(data[child]) ){
        var childArray = [];
        _.forEach(data[child], function(c){
          childArray.push(_.pick(c, collapsedProperties));
        });
        data[child] = childArray;
      }else{
        data[child] = _.pick(data[child], collapsedProperties);
      }

    }
  });

  return data;
}

module.exports = {
  createModel: createModel,
  getModel: getModel,
  expand: expand,
  collapse: collapse
};
