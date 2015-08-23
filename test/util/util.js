var Vantage = require("../../")
  , _ = require('lodash')
  ;

module.exports = {

  instances: [],

  spawn: function(options, cb) {

    options = options || {}

    options = _.defaults(options, {
      ports: [],
      ssl: false,
    });

    for (var i = 0; i < options.ports.length; ++i) {
      var vorpal = new Vantage();
      var port = options.ports[i];
      vorpal
        .delimiter(port + ':')
        .use(__dirname + "/server")
        .listen(port, function(){
          // Callback shouldn't throw.
        });
      module.exports.instances.push(vorpal);
    }

    cb(void 0, module.exports.instances);
    return;
  },

  kill: function(what, cb) {
    cb = cb || function(){}
    for (var i = 0; i < module.exports.instances.length; ++i) {
      // ...
    }
  },

}