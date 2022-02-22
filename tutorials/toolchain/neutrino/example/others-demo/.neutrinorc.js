const airbnbBase = require('@neutrinojs/airbnb-base');
const web = require('@neutrinojs/web');
const jest = require('@neutrinojs/jest');

module.exports = {
  options: {
    root: __dirname,
  },
  use: [
    airbnbBase(),
    web({
      html: {
        title: 'others-demo'
      }
    }),
    jest(),
  ],
};
