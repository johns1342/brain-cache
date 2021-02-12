
module.exports = function override(config, env) {
    //do stuff with the webpack config...
    config.mode = "development"
    config.optimization = {minimize: false}
    return config;
  }