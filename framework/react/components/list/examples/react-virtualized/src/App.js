import React, { Fragment } from 'react';
import { HashRouter, Route } from 'react-router-dom';
import Home from './pages/Home';
import Chat from './pages/Chat';
import {
  SimpleList,
  AutoHightList,
  WindowScrollerExample,
  InfiniteList,
  AutoHeightInfiniteList
} from './pages/List';

const App = () => (
  <HashRouter>
    <Fragment>
      <Route exact path="/" component={Home} />
      <Route exact path="/chat" component={Chat} />
      <Route exact path="/list/simple" component={SimpleList} />
      <Route exact path="/list/auto-height" component={AutoHightList} />
      <Route
        exact
        path="/list/windows-scroller"
        component={WindowScrollerExample}
      />
      <Route exact path="/list/infinite" component={InfiniteList} />
      <Route
        exact
        path="/list/auto-height-infinite"
        component={AutoHeightInfiniteList}
      />
    </Fragment>
  </HashRouter>
);

export default App;
