/**
 * 测试 use State
 */
import React, { useEffect, useState } from 'react';
import Logger from '../../../Logger';
import Page from '../../../Page';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handleResize = e => {
      setCount(count + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [count]);

  return (
    <div>
      <p>You resized {count} times</p>
    </div>
  );
}

export default Page.create({
  path: 'useeffectwithcleanup',
  title: 'Use Effect With Cleanup',
})(Example);
