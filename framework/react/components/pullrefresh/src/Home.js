import React from 'react';
import { Link } from 'react-router-dom';


const Home = () => (
  <ui>
    <li>
      <Link to="/">Home</Link>
    </li>
    <li>
      <Link to="/react-pullload/demo1">ReactPullLoad Demo1</Link>
    </li>
    <li>
      <Link to="/react-pullload/demo2">ReactPullLoad Demo2</Link>
    </li>
    <li>
      <Link to="/react-pullload/demo3">ReactPullLoad Demo3</Link>
    </li>
    <li>
      <Link to="/rmc-pull-to-refresh/demo1">PullToRefresh Demo1</Link>
    </li>
  </ui>
);

export default Home;
