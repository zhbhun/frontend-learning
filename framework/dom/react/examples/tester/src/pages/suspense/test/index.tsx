import { useMemo, useState, useTransition } from "react";

function fibonacci(n: number): number {
  if (n === 1 || n === 2) {
    return 1;
  }
  return fibonacci(n - 2) + fibonacci(n - 1);
}

function Demo(props: { value: number }) {
  return <div>{`${props.value}: ${fibonacci(35)}`}</div>;
}

function SuspenseTester() {
  const [pengding, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState("");

  const count = useMemo(() => {
    return inputValue.length;
  }, [inputValue]);

  // 效果更好
  const handleInputChange = (event: any) => {
    startTransition(() => {
      setInputValue(event.target.value);
    });
  };

  // 效果较差
  // const handleInputChange = (event: any) => {
  //   setInputValue(event.target.value);
  // };

  return (
    <div>
      <div>
        <input
          type="text"
          onChange={handleInputChange}
          style={{ width: 300 }}
        />
      </div>
      {Array(count)
        .fill(0)
        .map((_, i) => {
          return <Demo key={i} value={i + 1} />;
        })}
    </div>
  );
}

export default SuspenseTester;
