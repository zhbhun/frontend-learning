import React from 'react';
import { Route } from 'react-router-dom';
import Example from './Example';
import rootRoutes from './routes';

const renderRoutes = (allRoutes = [], routes, basePath = '') => {
  if (Array.isArray(routes)) {
    return routes.reduce((rcc, route) => {
      if (typeof route === 'string') {
        return rcc;
      }
      const routePath = `${basePath !== '/' ? `${basePath}/` : basePath}${
        route.path
      }`;
      let nrcc = rcc.concat([
        <Route
          key={routePath}
          exact
          path={routePath}
          render={() => <Example basePath={routePath} component={route} />}
        />,
      ]);
      if (typeof route === 'object' && Array.isArray(route.routes)) {
        nrcc = renderRoutes(nrcc, route.routes, routePath);
      }
      return nrcc;
    }, allRoutes);
  }
  return allRoutes;
};

export default () => <div>{renderRoutes([], rootRoutes)}</div>;
