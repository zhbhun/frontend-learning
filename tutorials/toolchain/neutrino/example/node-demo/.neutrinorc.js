const airbnbBase = require('@neutrinojs/airbnb-base');
const node = require('@neutrinojs/node');
const jest = require('@neutrinojs/jest');

module.exports = {
  options: {
    root: __dirname,
  },
  use: [
    airbnbBase(),
    node(),
    jest(),
  ],
};
