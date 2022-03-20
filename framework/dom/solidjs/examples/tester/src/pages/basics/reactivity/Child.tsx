import type { Component, JSX } from 'solid-js';
import { createMemo } from 'solid-js';

const Child: Component<{
  count: number;
}> = (props) => {
  const doubleCount = createMemo(() => {
    console.log('>> child doubleCount');
    return props.count * 2;
  });
  return <div>{doubleCount}</div>;
};

export default Child;
