import React from "react";

import RouterPage from '../RouterPage';

const routes = [
  {
    path: '/react/component/creation',
    title: 'Component',
    component: require('./component').default,
  },
  {
    path: '/react/component/lifecycle',
    title: 'Lifecycle',
    component: require('./lifecycle').default,
  },
  {
    path: '/react/ref',
    title: 'Refs',
    component: require('./ref').default,
  }
];

const ReactExample = () => <RouterPage routes={routes} />;

export default ReactExample;
