const { normalize, schema } = require('normalizr');

const user = new schema.Entity('users');

const a=  normalize([
  {
    id: '123',
    name: '1',
  }, {
    id: '2',
    name: '2',
  }],
  [user]
);

console.log(a);
