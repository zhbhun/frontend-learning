// @flow
import React from 'react';

import Router from './utils/Router';

import routes from './routes';

function Root() {
  return <Router routes={routes} />
}

export default Root;
