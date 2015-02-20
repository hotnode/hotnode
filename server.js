var configFile = './config.json';

var config = require(configFile);

var loadTime = new Date().getTime();

process.on('uncaughtException', function (e) {
  console.warn(e.stack || e);
});

var fs = require('fs');

var proxy = require('http-proxy').createProxyServer({});

proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if(config.appendForwardedProto) {
    proxyReq.setHeader('x-forwarded-proto', config.protocole);
  }
  if(config.appendHeaders) {
    for(var name in config.appendHeaders) {
      proxyReq.setHeader(name, config.appendHeaders[name]);
    }
  }
});

var http, target;

function setTarget() {
  if(config.target.indexOf('slave') === 0) {
    var index = config.target.replace(/[^0-9]/g, '');
    var slaves = config.slaves || config.slave;
    if(typeof(slaves) !== 'object') {
      slaves = [slaves];
    }
    if(typeof(slaves[index]) === 'string') {
      if(target !== slaves[index]) {
        target = target = slaves[index];;
        console.log('Target switched to ' + target);
      }
    } else {
      console.warn('No ' + index + ' index in ' + JSON.stringify(slaves));
    }
  } else if(config.master) {
    if(target !== config.master) {
      target = config.master;
      console.log('Target switched to ' + target);
    }
  } else {
    console.warn('No config.master provided! We still target ' + target);
  }
}
setTarget();

if(config.protocole === 'https') {
  var options = {
    key: fs.readFileSync(config.ssl.key),
    cert: fs.readFileSync(config.ssl.cert)
  };
  if(config.ssl.ca) {
    options.ca = config.ssl.ca.map(function (file) {
      return fs.readFileSync(file);
    });
  }
  http = require('https').bind(global, options);
} else {
  http = require('http');
}

function getNewConfig() {
  fs.readFile(configFile, function (err, contents) {
    if(! err) {
      try {
        var newConfig = JSON.parse(contents);
        if(typeof(newConfig) === 'object') {
          config = newConfig;
          setTarget();
        }
      } catch(e) {
        console.warn(e);
      }
    }
  });
}

function redirect(res, location, permanent) {
  res.writeHead(permanent ? 301 : 302, {
    Location: location
  });
  return res.end();
}

var server = http.createServer(function(req, res) {
  var host = (req.headers['host'] || '').toLowerCase();
  if(config.redirection.enabled) {
    return redirect(res, target + (config.redirection.appendUrl ? req.url : ''), config.redirection.type === 'permanent');
  }
  if(config['enforce-www'] && host.indexOf('www.') !== 0) {
    return redirect(res, config.protocole + '://www.' + host + req.url, true);
  }
  proxy.web(req, res, {
    target: target
  }, function (e) {
    console.warn(e);
  });
  var now = new Date().getTime();
  if(now - loadTime > config.ttl * 1000) {
    loadTime = now;
    getNewConfig();
  }
});

(config.listen || (process.env.PORT || '80').split(/[,;|\s]+/g)).forEach(server.listen.bind(server));
