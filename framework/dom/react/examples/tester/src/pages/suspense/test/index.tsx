import { useCallback, useRef, useState } from "react";

function fibonacci(n: number): number {
  if (n === 1 || n === 2) {
    return 1;
  }
  return fibonacci(n - 2) + fibonacci(n - 1);
}

function Demo(props: { value: number }) {
  return <div>{fibonacci(props.value)}</div>;
}

function SuspenseTester() {
  const [inputValue, setInputValue] = useState("");
  const [timerValue, setTimerValue] = useState(0);
  const [eventValue, setEventValue] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleStart = useCallback(() => {
    setTimeout(() => {
      setTimerValue(40);
      buttonRef.current?.click();
    }, 1000);
  }, []);
  return (
    <div>
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
          }}
        />
        <button onClick={handleStart}>start</button>
        <button ref={buttonRef} onClick={() => setEventValue(1)}>
          {eventValue}
        </button>
      </div>
      {Array(timerValue)
        .fill(0)
        .map((_, i) => {
          return <Demo key={i} value={i + 1} />;
        })}
    </div>
  );
}

export default SuspenseTester;
