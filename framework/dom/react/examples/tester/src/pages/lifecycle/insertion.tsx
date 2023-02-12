import { useInsertionEffect, useLayoutEffect, useState } from 'react';

function Demo1({ status }: { status: 0 | 1 }) {
  useInsertionEffect(() => {
    console.log('>> demo1 inserted');
    return () => {
      console.log('>> demo1 clean');
    };
  }, []);
  return <div>demo1: {status}</div>;
}

function Demo2({ status }: { status: 0 | 1 }) {
  useInsertionEffect(() => {
    console.log('>> demo2 inserted', status);
    return () => {
      console.log('>> demo2 clean', status);
    };
  }, [status]);
  return <div>demo2: {status}</div>;
}

function Demo3() {
  const [support, setSupport] = useState(true);
  useLayoutEffect(() => {
    const display = 'content-0';
    const ele = document.createElement('div');
    ele.style.display = display;
    setSupport(ele.style.display === display);
  }, []);
  return support ? <div>3-1</div> : <div>3-0</div>;
}

export default function InsetionTester() {
  const [status, setStatus] = useState<0 | 1>(0);
  return (
    <div>
      <div>
        <button onClick={() => setStatus(status === 1 ? 0 : 1)}>switch</button>
      </div>
      {status === 0 ? <Demo1 status={status} /> : null}
      <Demo2 status={status} />
      <Demo3 />
    </div>
  );
}
