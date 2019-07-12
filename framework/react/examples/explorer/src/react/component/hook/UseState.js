/**
 * 测试 use State
 */
import React, { useState } from 'react';
import Logger from '../../../Logger';
import Page from '../../../Page';

function Example() {
  // Declare a new state variable, which we'll call "count"
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}

export default Page.create({
  path: 'usestate',
  title: 'UseState',
})(Example);
