import { type Component, createSignal } from 'solid-js';

function Child(props: { count: number }) {
  console.log('>> child', props.count);
  return <div data-count={props.count}>{props.count}</div>;
}

function Demo(props: { count: number }) {
  console.log('>> demo', props.count);
  return <Child count={props.count} />;
}

export default (() => {
  const [count, setCount] = createSignal(0);
  const handleClick = () => {
    setCount((currCount) => currCount + 1);
  };
  return (
    <div onClick={handleClick}>
      <Demo count={count()} />
    </div>
  );
}) as Component;
