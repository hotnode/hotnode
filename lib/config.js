var configFile = __dirname + '/../config.json';

var config = require(configFile);

config.save = function () {
  var newConfig = {};
  for(var key in this) {
    if(key !== 'save') {
      newConfig[key] = this[key];
    }
  }
  try {
    require('fs').writeFileSync(configFile, JSON.stringify(newConfig, null, 2));
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = config;
