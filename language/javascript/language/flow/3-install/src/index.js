// @flow

/* eslint-disable no-console */

import Dog from './dog'

const toby = new Dog('Toby');
// const toby = new Dog(123); // flow error

console.log(toby.bark())
