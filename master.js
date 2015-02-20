var config = require('./lib/config');

config.target = 'master';

console.log(config.save() ? 'Target switched into master' : 'File not writable.');
