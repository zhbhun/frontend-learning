const airbnb = require('@neutrinojs/airbnb');
const preact = require('@neutrinojs/preact');
const jest = require('@neutrinojs/jest');

module.exports = {
  options: {
    root: __dirname,
  },
  use: [
    airbnb(),
    preact({
      html: {
        title: 'preact-demo'
      }
    }),
    jest(),
  ],
};
