import React from 'react';
import PropTypes from 'prop-types';

function Parent({ children }) {
  return <div>{`${String(children)}: ${typeof children}`}</div>;
}

function ChildrenTester() {
  return (
    <ul>
      <li>
        <Parent>{undefined}</Parent>
      </li>
      <li>
        <Parent>{null}</Parent>
      </li>
      <li>
        <Parent>1</Parent>
      </li>
      <li>
        <Parent>a</Parent>
      </li>
      <li>
        <Parent>{true}</Parent>
      </li>
      <li>
        <Parent>{false}</Parent>
      </li>
      <li>
        <Parent>{1}</Parent>
      </li>
      <li>
        <Parent>{'a'}</Parent>
      </li>
      <li>
        <Parent>{{}}</Parent>
      </li>
      <li>
        <Parent>{[]}</Parent>
      </li>
      <li>
        <Parent>{() => null}</Parent>
      </li>
    </ul>
  );
}

ChildrenTester.title = 'Children';

export default ChildrenTester;
