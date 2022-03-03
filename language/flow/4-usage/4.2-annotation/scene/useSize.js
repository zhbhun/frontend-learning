/**
 * useSize.js
 * @flow
 */
var size = require('./size');
var result = size(null);

/*
6: var result = size(null);
                      ^^^^ null. This type is incompatible with the expected param type of
5: function size(input: string): number {
                        ^^^^^^ string. See: scene/size.js:5
*/
