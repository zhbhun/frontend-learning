import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => (
  <ul className="Home">
    <li>
      <Link to="/chat">Chat</Link>
    </li>
    <li>
      <Link to="/list/simple">Simple List</Link>
    </li>
    <li>
      <Link to="/list/auto-height">Auto Height List</Link>
    </li>
    <li>
      <Link to="/list/windows-scroller">Windows Scroller Of List</Link>
    </li>
    <li>
      <Link to="/list/infinite">Infinite List</Link>
    </li>
    <li>
      <Link to="/list/auto-height-infinite">Auto Height Infinite List</Link>
    </li>
  </ul>
);

export default Home;
