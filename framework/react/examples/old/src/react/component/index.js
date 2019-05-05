import React from "react";

import RouterPage from '../../RouterPage';

const routes = [
  {
    path: '/react/component/creation/create-class',
    title: 'createClass',
    component: require("./CreateClassExample").default,
  },
  {
    path: '/react/component/creation/component',
    title: 'Component',
    component: require("./ComponentExample").default,
  },
  {
    path: '/react/component/creation/pure-component',
    title: 'PureComponent',
    component: require("./PureComponentExample").default,
  },
  {
    path: '/react/component/creation/stateless',
    title: 'Stateless Functional Component',
    component: require("./StatelessExample").default,
  }
];

const ComponentCreationExample = () => <RouterPage routes={routes} />

export default ComponentCreationExample;
