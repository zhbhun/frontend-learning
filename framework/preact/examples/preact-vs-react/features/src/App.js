import React from 'react';
import ApisTester from './tester/ApisTester';
import PropTypesTester from './tester/PropTypesTester';
import ChildrenTester from './tester/ChildrenTester';
import RenderTester from './tester/RenderTester';
import EventTester from './tester/EventTester';
import './App.css';

function App() {
  const testers = [
    ApisTester,
    PropTypesTester,
    ChildrenTester,
    RenderTester,
    EventTester,
  ];

  return (
    <div className="App">
      {testers.map((Tester, index) => {
        return (
          <div key={index} className="Collapse">
            <h3>{Tester.title || ''}</h3>
            <Tester />
            <hr />
          </div>
        );
      })}
    </div>
  );
}

export default App;
