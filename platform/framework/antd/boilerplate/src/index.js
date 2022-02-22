import React from 'react';
import ReactDOM from 'react-dom';

import './index.less';
import Root from './Root';

function renderRoot(Component) {
  const appElement = document.getElementById('app');
  try {
    ReactDOM.render(<Component />, appElement);
  } catch (e) {
    console.error(e.stack);
  }
}

renderRoot(Root);


if (module.hot) {
  module.hot.accept('./Root', () => {
    const NextRoot = require('./Root').default;
    renderRoot(NextRoot);
  });
}

