'use strict';

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

module.exports = CacheBucket;
