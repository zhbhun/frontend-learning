/**
 * 测试 use State
 */
import React, { useEffect, useState } from 'react';
import Logger from '../../../Logger';
import Page from '../../../Page';

function Example() {
  const [count, setCount] = useState(0);

  // Similar to componentDidMount and componentDidUpdate:
  useEffect(() => {
    // Update the document title using the browser API
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}

export default Page.create({
  path: 'useeffect',
  title: 'UseEffect',
})(Example);
