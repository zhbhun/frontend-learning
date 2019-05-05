import React from "react";

import RouterPage from '../../RouterPage';

const routes = [
  {
    path: '/react/component/lifecycle/mounting',
    title: 'Mounting',
    component: require("./MountingExample").default,
  },
  {
    path: '/react/component/lifecycle/updating',
    title: 'Updating',
    component: require("./UpdatingExample").default,
  },
  {
    path: '/react/component/lifecycle/error-handling',
    title: 'Error Handling',
    component: require("./ErrorHandlingExample").default,
  },
];

const LifecycleExample = () => <RouterPage routes={routes} />

export default LifecycleExample;
