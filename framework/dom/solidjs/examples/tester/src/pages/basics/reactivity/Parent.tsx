import type { Component } from 'solid-js';
import { createMemo, createSignal } from 'solid-js';
import Child from './Child';

const ReactivityTester: Component = () => {
  const [count, setCount] = createSignal(0);
  const handleClick = () => {
    setCount(count() + 1);
  };
  const doubleCount = createMemo(() => {
    console.log('>> parent doubleCount');
    return count() * 2;
  });
  return (
    <div onClick={handleClick}>
      <Child count={count()} />
    </div>
  );
};

export default ReactivityTester;
