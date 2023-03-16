import { useEffect, useRef, useState } from 'react';

const RefTester = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('data-ts', Date.now().toString());
    }
  }, []);
  return (
    <div ref={ref} data-count={count} onClick={() => setCount((prevCount) => prevCount + 1)}>
      {count}
    </div>
  );
};

export default RefTester;
