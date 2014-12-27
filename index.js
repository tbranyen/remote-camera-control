var fs = require('fs');
var express = require('express');
var exec = require('child_process').exec;
var combynExpress = require('combynexpress');
var settings = require('./lib/settings');

var api = express();

var current = 0;
var total = 0;

var actions = [];

settings.list(function(res) {
  var string = res.toString();

  actions = string.split('\n').filter(function(item) {
    return item.indexOf('/main/settings') === 0;
  }).map(function(item) {
    return item.split('/main/settings/')[1]; 
  });

  // Start API after done fetching settings.
  api.listen(80, "0.0.0.0", function() {
    console.log('Web server');
  });
});

api.engine('html', combynExpress());
api.set('view engine', 'html');

api.get('/jquery.js', function(req, res) {
  fs.createReadStream('node_modules/jquery/dist/jquery.js').pipe(res);
});

api.get('/', function(req, res) {
  res.render('home', {
    actions: actions,
    timelapse: total ? current / total : 0
  });
});

api.get('/take/preview', function(req, res) {
  takePreview(function() {
    res.end('<script>window.parent.location.reload()</script>');
  });
});

api.get('/settings', function(req, res) {
  settings.list(function(res) {
    res.json(res);
  });
});

api.get('/settings/:name', function(req, res) {

});

api.get('/preview.jpg', function(req, res) {
  res.writeHead(200, {
    'Content-Type' : 'image/jpeg'
  });

  fs.createReadStream('preview.jpg').pipe(res);
});

api.get('/take/amount/:amount', function(req, res) {
  total = Number(req.params.amount);

  takeSeries(function() {});
});

function takePhoto(cb) {
  exec('gphoto2 --capture-image', function(err) {
    setTimeout(function() {
      return cb();
    }, 5 * 1000);
  });
}

function takeSeries(cb) {
  if (current !== total) {
    takePhoto(function() {
      current++;
      takeSeries(cb);
    });
  }
  else {
    current = 0;
    total = 0;
    cb();
  }
}

function takePreview(cb) {
  exec('gphoto2 --capture-preview --force-overwrite', function(err) {
    // Convert RAW to JPEG
    exec('convert capture_preview.jpg preview.jpg', function(err) {
      return cb();
    });
  });
}
