import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Route } from 'react-router-dom'
import Home from './Home';
import ReactPullLoad from './react-pullload';
import PullToRefresh from './rmc-pull-to-refresh';
import './index.css';


ReactDOM.render((
  <Router>
    <Fragment>
      <Route exact path="/" component={Home} />
      <Route exact path="/react-pullload/demo1" component={ReactPullLoad.Demo1} />
      <Route exact path="/react-pullload/demo2" component={ReactPullLoad.Demo2} />
      <Route exact path="/react-pullload/demo3" component={ReactPullLoad.Demo3} />
      <Route exact path="/rmc-pull-to-refresh/demo1" component={PullToRefresh.Demo1} />
    </Fragment>
  </Router>
), document.getElementById('root'));

