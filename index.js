'use strict';

var Q = require('q'),
    _ = require('lodash');

var MODELS = {};

function getModel(name){
  if(!name || !_.isString(name)) throw new Error('a model name was not provided');
  var model = MODELS[name];
  if(!model) throw new Error('a model with that name does not exists');
  return model;
}

function createModel(config){

  var sanitizeArray = function(arr, type){
    if( _.isArray(arr) ){
      _.forEach(arr, function(a){
        if( !_.isString(a) ) throw new Error(type + ' must be an array of strings');
      });
    }else if( _.isString(arr) ){
      return [arr];
    }else{
      return [];
    }
  };
  if( !config.name ) throw new Error('a model name was not provided');
  if( !config.provider ) throw new Error('a model provider was not provided');
  if( !config.key ) throw new Error('a model key was not provided');
  if( !_.isFunction(config.provider) ) throw new Error('a model provider must be a function');

  MODELS[config.name] = {
    name: config.name,
    provider: config.provider,
    children: sanitizeArray(config.children),
    key: config.key,
    collapsables: sanitizeArray(config.collapsables)
  };
}

function expandMany(model, data){
  return Q.Promise(function(resolve, reject) {

    var promises = _.map(data, function(d){
      return expand(model.name, d);
    });

    Q.all(promises).spread(function(){
      resolve(Array.prototype.slice.call(arguments));
    }, reject);

  });
}

function expand(name, data){
  return Q.Promise(function(resolve, reject) {

    var model = getModel(name);

    // we can pass an array of models or a single model
    if( _.isArray(data) ) return resolve(expandMany(model, data));

    var promises = [];

    _.forEach(model.children, function(prop){
      if(data.hasOwnProperty(prop)){

        var childModel = MODELS[prop];
        var childValue = data[prop];

        if(childModel && childValue){
          // can resolve a single child or an array of children
          var childPromises = [];

          var keyOrValue = function(item){
            return _.isObject(item) ? item[childModel.key] : item;
          };

          if( _.isArray(childValue) ){

            data[prop] = [];
            _.forEach(childValue, function(c){
              var keyValue = keyOrValue(c);
              var childPromise = childModel.provider(keyValue).then(function(results){
                if(results) data[prop].push(results);
              });
              childPromises.push(childPromise);
            });

          }else{

            var keyValue = keyOrValue(childValue);
            var childPromise = childModel.provider(keyValue).then(function(results){
              if(results) data[prop] = results;
            });
            childPromises.push(childPromise);

          }

          if(childPromises.length) promises = promises.concat(childPromises);
        }

      }
    });

    if(!promises.length) return resolve(data);

    Q.all(promises).spread(function(){resolve(data);}, reject);

  });
}

module.exports = {
  createModel: createModel,
  getModel: getModel,
  expand: expand
};
