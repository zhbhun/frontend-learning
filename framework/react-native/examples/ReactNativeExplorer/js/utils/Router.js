import React, { PropTypes, Component } from 'react';

import Page from './Page';

function mapReduceRoutes(routes) {
  if (!Array.isArray(routes)) {
    return null;
  }
  return routes.reduce((map, route) => {
    const { path, component, childRoutes } = route;
    map[path] = route;
    if (Array.isArray(childRoutes)) {
      const childRoutesMap = mapReduceRoutes(childRoutes);
      Object.assign(
        map,
        Object.keys(childRoutesMap).reduce((childMap, key) => {
          const childRoute = childRoutesMap[key]
          const childRoutePath = `${path}/${key}`;
          childRoute.path = childRoutePath;
          childMap[childRoutePath] = childRoute;
          return childMap;
        }, {}),
      );
    }
    return map;
  }, {});
}

class Router extends Component {

  static propTypes = {
    routes: PropTypes.arrayOf(PropTypes.shape({
      path: PropTypes.string,
      component: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.object,
      ]),
      examples: PropTypes.array,
    })),
  };

  static childContextTypes = {
    goBack: PropTypes.func,
    push: PropTypes.func,
    route: PropTypes.object,
  };

  getChildContext = () => {
    return {
      route: this.state.route,
      goBack: this.goBack,
      push: this.push,
    };
  }

  goBack = () => {
    const { stack } = this.state;
    const length = stack.length;
    if (length > 1) {
      const lastRoute = stack[length - 2];
      this.setState({
        route: lastRoute,
        stack: stack.slice(0, length - 1),
      });
    }
  }

  push = (path) => {
    const route = this.routesMap[path];
    if (route) {
      this.setState({
        route,
        stack: this.state.stack.concat([route]),
      });
    }
  }

  constructor(props) {
    super(props);

    const routesMap = mapReduceRoutes(props.routes);
    const defaultRoute = props.routes[0];

    console.log(routesMap);

    this.routesMap = routesMap;
    this.state = {
      route: defaultRoute,
      stack: [defaultRoute],
    };
  }

  render() {
    const { route } = this.state;
    const { component, childRoutes } = route;
    if (typeof component === 'function') {
      const ReactComponent = component;
      return <ReactComponent route={route} />
    } else {
      return (
        <Page
          {...component}
          examples={childRoutes}
        />
      );
    }
  }
}

export default Router;
