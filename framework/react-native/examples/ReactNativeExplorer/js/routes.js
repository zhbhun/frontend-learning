// @flow
import components from './components';
import layout from './layout';

import App from './App';

export default [{
  path: '/',
  component: App,
  childRoutes: [
    components,
    layout,
  ],
}];
