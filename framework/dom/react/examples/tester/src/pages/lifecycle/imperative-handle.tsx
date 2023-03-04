import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

const Demo0 = forwardRef<HTMLDivElement, any>((props, ref) => {
  const [count, setCount] = useState(0);
  return (
    <div ref={ref} onClick={() => setCount((preCount) => preCount + 1)}>
      {count}
    </div>
  );
});

const Demo1 = forwardRef<HTMLDivElement, any>((props, ref) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useImperativeHandle(ref, () => {
    // 每次渲染都会重新执行
    console.log('>> demo1', rootRef.current);
    return rootRef.current as HTMLDivElement;
  });
  return (
    <div ref={rootRef} onClick={() => setCount((preCount) => preCount + 1)}>
      {count}
    </div>
  );
});

const Demo2 = forwardRef<HTMLDivElement, any>((props, ref) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useImperativeHandle(
    ref,
    () => {
      // 只执行一次
      console.log('>> demo2', rootRef.current);
      return rootRef.current as HTMLDivElement;
    },
    []
  );
  return (
    <div ref={rootRef} onClick={() => setCount((preCount) => preCount + 1)}>
      {count}
    </div>
  );
});

function ImperativeHandleTester() {
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  return (
    <div>
      <Demo0 />
      <Demo1 ref={ref1} />
      <Demo2 ref={ref2} />
    </div>
  );
}

export default ImperativeHandleTester;
