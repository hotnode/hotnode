var fs = require('fs');

var configFile = './config.json';

var config = require(configFile);

var loadTime = (new Date).getTime();

var http = require('http');

var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(function(req, res) {
  var time = (new Date).getTime();
  if(time - loadTime > config.ttl * 1000) {
    loadTime = time;
    fs.readFile(configFile, function (err, contents) {
      if(! err) {
        try {
          var newConfig = JSON.parse(contents);
          if(typeof(newConfig) === 'object') {
            config = newConfig;
          }
        } catch(e) {
          console.warn(e);
        }
      }
    });
  }
  proxy.web(req, res, { target: config.master }, function (e) {
    console.warn(e);
  });
});

var ports = config.listen || (process.env.PORT || '80').split(/[,;|\s]+/g);
ports.forEach(function (port) {
  server.listen(port);
});
