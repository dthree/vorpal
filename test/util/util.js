var Vantage = require('../../');
var _ = require('lodash');
var path = require('path');

module.exports = {

  instances: [],

  spawn: function (options, cb) {
    options = options || {};
    options = _.defaults(options, {
      ports: [],
      ssl: false
    });

    for (var i = 0; i < options.ports.length; ++i) {
      var vorpal = new Vantage();
      var port = options.ports[i];
      vorpal
        .delimiter(port + ':')
        .use(path.join(__dirname, '/server'))
        .listen(port);
      module.exports.instances.push(vorpal);
    }

    cb(undefined, module.exports.instances);
    return;
  },

  kill: function (what, cb) {
    cb = cb || function () {};
  }
};
