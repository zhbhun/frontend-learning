import { useCallback, useState } from 'react';

function Demo1() {
  const [count, setCount] = useState(0);
  const handleRef = (el: HTMLDivElement) => {
    // 如果 handleRef 动态生成，那么会在每次重新渲染时会调用一次，第一次传入 null，第二次传入最新的元素引用
    console.log('>> demo1', el);
  };
  return (
    <div ref={handleRef} onClick={() => setCount((preCount) => preCount + 1)}>
      {count}
    </div>
  );
}

function Demo2() {
  const [count, setCount] = useState(0);
  const handleRef = useCallback((el: HTMLDivElement) => {
    // 只有初始化的时候会调用
    console.log('>> demo2', el);
  }, []);
  return (
    <div ref={handleRef} onClick={() => setCount((preCount) => preCount + 1)}>
      {count}
    </div>
  );
}

function RefTester() {
  return (
    <div>
      <Demo1 />
      <Demo2 />
    </div>
  );
}

export default RefTester;
