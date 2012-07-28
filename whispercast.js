/**
 * Whispercast: Serves media files from a local directory over HTTP.
 * Copyright 2012 Manas Tungare.
 * http://manas.tungare.name/publications/tungare_2009_best
 */

var fs = require('fs');
var http = require('http');
var mime = require('mime');
var path = require('path');
var util = require('util');

var BASE_PATH = '.';
var PORT = 8888;

http.createServer(function (req, res) {
  if (req.method != 'GET') {
    res.writeHead(400);
    res.write('Only GET is supported.');
    res.end();
    return;
  }

  var localFileOrDir = path.join(BASE_PATH, decodeURIComponent(req.url));
  fs.stat(localFileOrDir, function(err, stats) {
    if (err && err.code == 'ENOENT') {
      res.writeHead(404);
      res.write(util.inspect(err));
      res.end();
      return;
    }

    if (stats.isDirectory()) {
      serveIndex(res, localFileOrDir, decodeURIComponent(req.url));
    } else {
      serveStaticFile(res, localFileOrDir);
    }
  });

}).listen(PORT);

console.log(util.format('Serving files from %s on at http://localhost:%s/', BASE_PATH, PORT));


function serveIndex(res, diskPath, relativePath) {
  res.writeHead(200, {'content-type': 'text/html'});
  res.write(util.format('<title>%s</title>', relativePath));
  res.write('<meta name="viewport" content="width=device-width,initial-scale=1">');
  res.write('<style>' +
      '*{box-sizing:border-box;margin:0;color:#fff;font-family:sans-serif;}' +
      'body{margin:12px;background:#000}' +
      'img{min-width:50%;max-width:100%}' +
      'a,figure{background:#333;display:block;text-decoration:none;padding:6px 12px;margin:6px 0}' +
      'figure{padding:12px}' +
      '</style>');

  fs.readdir(diskPath, function(err, files) {
    if (err) {
      res.write(util.inspect(err));
    }

    res.write(util.format('<h1>%s (%s)</h1>', relativePath, files.length));

    for (var i = 0; i < files.length; i++) {
      var fileName = files[i];

      if (fileName.charAt(0) == '.') {
        continue;
      }

      var encodedPath = path.join(encodeURI(relativePath), encodeURIComponent(fileName));
      if (fileName.match(/\.png$/i) || fileName.match(/\.jpg$/i) || fileName.match(/\.jpeg$/i)) {
        res.write(util.format('<figure><figcaption>%s</figcaption><img src="%s"></figure>', fileName, encodedPath));
      } else {
        res.write(util.format('<a href="%s">%s</a>', encodedPath, fileName));
      }
    }

    res.end();
  });
}

function serveStaticFile(res, fileName) {
  var s = fs.createReadStream(fileName);
  s.on('error', function(err) {
    res.writeHead(404);
    res.write(util.inspect(err));
    res.end();
  });

  s.once('fd', function() {
    res.writeHead(200, {'content-type': mime.lookup(fileName)});
  });

  s.pipe(res);
}
