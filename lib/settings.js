var exec = require('child_process').exec;

exports.list = function(cb) {
  var child = exec('gphoto2 --list-config', function(err, value) {
    cb(value);
  });
};

exports.set = function() {

};

exports.get = function() {

};
