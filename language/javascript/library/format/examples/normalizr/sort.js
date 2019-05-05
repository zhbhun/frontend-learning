const { normalize, schema } = require('normalizr');
const stringifyObject = require('stringify-object');

const user = new schema.Entity('users');

const normalizedData = normalize(
  [
    {
      id: 3,
      name: 'a'
    },
    {
      id: 2,
      name: 'a'
    },
    {
      id: 1,
      name: 'a'
    }
  ],
  [user]
);

console.log(stringifyObject(normalizedData, { indent: '  ' }));
