import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import RouterPage from './RouterPage';

const routes = [
  {
    path: '/react',
    title: 'React',
    component: require('./react').default,
  },
];

const App = () => (
  <Router>
    <RouterPage routes={routes} />
  </Router>
);

export default App;
