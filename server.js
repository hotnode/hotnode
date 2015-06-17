var configFile = './config.json';

var config = require(configFile);

process.on('uncaughtException', function (e) {
  if(! e.code || e.code !== 'ECONNREFUSED') {
    console.warn(e.stack || e);
  }
});

var fs = require('fs');

var proxy = require('http-proxy').createProxyServer({
  xfwd: config.xForwardHeaders
});

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

function getSlavesList() {
  var slaves = config.slaves || config.slave;
  return typeof(slaves) !== 'object' ? [slaves] : slaves;
}

function setTarget() {
  if(config.target.indexOf('slave') === 0) {
    var index = config.target.replace(/[^0-9]/g, '');
    var slaves = getSlavesList();
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

function rescue(i) {
  i = i || 0;
  var slaves = getSlavesList();
  if(slaves.length <= i) {
    console.warn('master and all slaves seem to be dead!');
  } else {
    var slave = slaves[i];
    alive(slave, function (slaveIsAlive) {
      if(slaveIsAlive) {
        target = slave;
        console.warn('master is dead, rescue mode on ' + target);
      } else {
        rescue(i + 1);
      }
    });
  }
}

function alive(host, done) {
  var expire = setTimeout(function () {
    expire = null;
    done(false);
  }, config.rescue.timeout * 1000);
  http.get(host + config.rescue.alive, function (res) {
    if(res.statusCode === 200) {
      var contents = '';
      res.on('data', function (chunk) {
        contents += chunk;
      });
      res.on('end', function () {
        if(expire) {
          done(contents === 'alive');
          clearTimeout(expire);
        }
      });
    } else {
      if(expire) {
        done(false);
        clearTimeout(expire);
      }
    }
  }).on('error', function (err) {
    done(false);
    clearTimeout(expire);
  });
}

function getNewConfig() {
  fs.readFile(configFile, function (err, contents) {
    if(! err) {
      try {
        var newConfig = JSON.parse(contents);
        if(typeof(newConfig) === 'object') {
          config = newConfig;
          setTarget();
          if(config.rescue.enabled && target === config.master) {
            alive(config.master, function (masterIsAlive) {
              masterIsAlive || rescue();
            });
          }
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

fs.watch('.', getNewConfig);
getNewConfig();

var server = http.createServer(function(req, res) {
  var host = (req.headers['host'] || '').toLowerCase();
  if(config.redirection.enabled) {
    return redirect(res, target + (config.redirection.appendUrl ? req.url : ''), config.redirection.type === 'permanent');
  }
  if(config.enforceWww && host.indexOf('www.') !== 0) {
    return redirect(res, config.protocole + '://www.' + host + req.url, true);
  }
  proxy.web(req, res, {
    target: target
  }, function (e) {
    console.log('Error on target ' + target);
    console.warn(e);
  });
});

(config.listen || (process.env.PORT || '80').split(/[,;|\s]+/g)).forEach(server.listen.bind(server));
