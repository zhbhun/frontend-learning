require('isomorphic-fetch');
const nock = require('nock');

const scope1 = nock('https://api.github.com')
  .persist()
  .get('/test1')
  .reply(200, {
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZTEz',
    },
  })
  .get('/test2')
  .reply(200, {
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZTEz',
    },
  })

const scope2 = nock('https://api.github.com')
  .get('/test2')
  .reply(200, {
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
      node_id: 'MDc6TGljZW5zZTEz',
    },
  })

console.log(nock.isDone());
console.log(scope1.isDone());
console.log(scope2.isDone());


fetch('https://api.github.com/test1')
  .then(response => response.json())
  .then(data => console.log(data));

fetch('https://api.github.com/test2')
  .then(response => response.json())
  .then(data => console.log(data));


fetch('https://api.github.com/test2')
  .then(response => response.json())
  .then(data => console.log(data));

// fetch('https://api.github.com/test2')
//   .then(response => response.json())
//   .then(data => console.log(data));

console.log(nock.isDone());
console.log(scope1.isDone());
console.log(scope2.isDone());

// fetch('https://api.github.com/repos/atom/atom/license')
//   .then(response => response.json())
//   .then(data => console.log(data));
