const { normalize, schema } = require('normalizr');
const stringifyObject = require('stringify-object');

const data = {
  id_str: '123',
  url: 'https://twitter.com',
  user: { id_str: '456', name: 'Jimmy' }
};

const user = new schema.Entity('users', {}, { idAttribute: 'id_str' });
const tweet = new schema.Entity(
  'tweets',
  { user: user },
  {
    idAttribute: 'id_str',
    // Apply everything from entityB over entityA, except for "favorites"
    // mergeStrategy: (entityA, entityB) => ({
    //   ...entityA,
    //   ...entityB,
    //   favorites: entityA.favorites
    // }),
    // Remove the URL field from the entity
    processStrategy: (entity, parent, key) => {
      return Object.assign({}, entity, { url: undefined });
    }
  }
);

const normalizedData = normalize(data, tweet);

console.log(stringifyObject(normalizedData));
