var fs = require('fs');
var Promise = require('bluebird');
var express = require('express');
var exec = require('child_process').exec;
var combynExpress = require('combynexpress');
var camera = require('./lib/camera');

var api = express();
var current = 0;
var total = 0;

function recover() {
  var device = '/dev/bus/' + api.camera.port.replace(/[,:]/g, '/');

  return new Promise(function(resolve, reject) {
    exec('fuser ' + device, function(err, output) {
      var pid = String(output).split(' ')[1];

      if (err || pid === String(process.pid) || !pid) {
        return resolve();
      }

      console.log('Issue claiming device: %s', device);

      exec('kill -9 ' + pid, resolve);
    });
  });
}


// Start API after done fetching settings.
camera.ready().then(function(cameras) {
  // Use the first one by default.
  api.camera = cameras[0];
  api.camera.config = api.camera.getConfigAsync();

  recover().then(function() {
    api.listen(80, '0.0.0.0', function() {
      console.log('Started web server');
    });
  });
});

api.engine('html', combynExpress());
api.set('view engine', 'html');

api.get('/jquery.js', function(req, res) {
  fs.createReadStream('node_modules/jquery/dist/jquery.js').pipe(res);
});

api.get('/', function(req, res) {
  api.camera.config.then(function(config) {
    res.render('home', {
      timelapse: total ? current / total : 0,
      config: config,
      settings: config.main.children.settings
    });
  });
});

api.get('/take/preview', function(req, res) {
  takePreview(function() {
    res.end('<script>window.parent.location.reload()</script>');
  });
});

api.get('/settings', function(req, res) {
  api.camera.getConfigAsync().then(res.json);
});

api.post('/settings/:name/:value', function(req, res) {
  var name = req.params.name;
  var value = req.params.value;

  api.camera.config.then(function(config) {
    api.camera.setConfigValue(name, value, function(err) {
      if (err) {
        console.log(err);
        res.end('<script>window.alert("Unable to save settings")</script>');
      }

      config.main.children.settings[name] = value;

      res.end('<script>window.alert("Saved settings")</script>');
    });
  });
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
  return api.camera.takePictureAsync({ download: false }).then(function() {
    setTimeout(function() {
      return cb();
    }, 5 * 1000);
  }).catch(function() {
    return recover().then(function() {
      return takePhoto(cb);
    });
  });
}

function takeSeries(cb) {
  if (current !== total) {
    takePhoto(function() {
      current++;

      takePreview(function() {
        setTimeout(function() {
          takeSeries(cb);
        }, 2 * 60 * 1000);
      });
    });
  }
  else {
    current = 0;
    total = 0;
    cb();
  }
}

function takePreview(cb) {
  api.camera.takePicture({
   preview: true,
   targetPath: '/tmp/foo.XXXXXX'
  }, function(err, path) {
    if (err) {
      return recover().then(function() {
        return takePreview(cb);
      });
    }

    // Convert RAW to JPEG
    exec('convert ' + path + ' preview.jpg ; rm ' + path, function(err) {
      return cb();
    });
  });
}
