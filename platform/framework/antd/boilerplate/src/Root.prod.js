import React from 'react';
import { Router, hashHistory } from 'react-router';
import routes from './routes';

export default function Root() {
  return (
    <Router history={hashHistory} routes={routes} />
  );
}
