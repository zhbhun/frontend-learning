import React from "react";

import RouterPage from '../../RouterPage';

const routes = [
  {
    path: '/react/ref/demo1',
    title: 'Demo1',
    component: require('./Demo1').default,
  },
  {
    path: '/react/ref/demo2',
    title: 'Demo2',
    component: require('./Demo2').default,
  },
  {
    path: '/react/ref/demo3',
    title: 'Demo3',
    component: require('./Demo3').default,
  },
];

export default () => <RouterPage routes={routes} />;
