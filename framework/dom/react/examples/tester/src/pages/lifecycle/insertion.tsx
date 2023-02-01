import { useInsertionEffect, useState } from 'react';

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

export default function InsetionTester() {
  const [status, setStatus] = useState<0 | 1>(0);
  return (
    <div>
      <div>
        <button onClick={() => setStatus(status === 1 ? 0 : 1)}>switch</button>
      </div>
      {status === 0 ? <Demo1 status={status} /> : null}
      <Demo2 status={status} />
    </div>
  );
}
