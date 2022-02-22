import React from 'react';
import { AppContainer } from 'react-hot-loader';
import { Router, hashHistory } from 'react-router';
import routes from './routes';

export default function Root() {
  return (
    <AppContainer>
      <Router history={hashHistory} routes={routes} />
    </AppContainer>
  );
}
