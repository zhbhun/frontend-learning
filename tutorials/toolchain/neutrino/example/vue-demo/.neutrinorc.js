const airbnbBase = require('@neutrinojs/airbnb-base');
const vue = require('@neutrinojs/vue');
const jest = require('@neutrinojs/jest');

module.exports = {
  options: {
    root: __dirname,
  },
  use: [
    airbnbBase(),
    vue({
      html: {
        title: 'vue-demo'
      }
    }),
    jest(),
  ],
};
