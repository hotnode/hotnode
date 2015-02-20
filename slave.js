var slaveIndex = parseInt(process.argv[2] || 0);

if(isNaN(slaveIndex) || slaveIndex < 0) {
	slaveIndex = 0;
}

var config = require('./lib/config');

config.target = 'slave' + slaveIndex;

console.log(config.save() ? 'Target switched into slave ' + slaveIndex : 'File not writable.');
