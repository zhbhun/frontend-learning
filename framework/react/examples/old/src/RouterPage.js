import React from 'react';
import PropTypes from 'prop-types';
import { Route, Link } from "react-router-dom";

const RouterPage = ({ routes, ...restProps }) => (
  <div {...restProps}>
    <ul>
      {routes.map(({ path, title }) => (
        <li key={path}>
          <Link to={path}>{title}</Link>
        </li>
      ))}
    </ul>
    <hr />
    <main>
      {routes.map(({ path, component }) => (
        <Route key={path} path={path} component={component} />
      ))}
    </main>
  </div>
);

RouterPage.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.shape({
    path: PropTypes.string,
    title: PropTypes.string,
    component: PropTypes.func,
  })).isRequired,
};

export default RouterPage;
