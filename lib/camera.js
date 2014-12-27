var fs = require('fs');
var gphoto2 = require('gphoto2');
var Promise = require('bluebird');

var GPhoto = new gphoto2.GPhoto2();

exports.ready = function() {
  return new Promise(function(resolve, reject) {
    GPhoto.list(function(cameras) {
      if (cameras.length) {
        resolve(cameras.map(Promise.promisifyAll));
      }
      else {
        reject(cameras);
      }
    });
  });
};
