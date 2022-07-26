import { useState } from "react";
import { Observer, useLocalObservable, useObserver } from "mobx-react";

export default () => {
  const [count, setCount] = useState(0);
  const counter = useLocalObservable(() => ({
    value: 0,
    increase() {
      this.value += 1;
    },
  }));
  console.log(">>", Date.now());
  return (
    <div>
      <li>
        {useObserver(() => {
          console.log(">> mobx local counter1");
          return (
            <button onClick={() => counter.increase()}>
              {counter.value + count}
            </button>
          );
        })}
      </li>
      <li>
        {count > 0 ? (
          <Observer>
            {() => {
              console.log(">> mobx local counter2");
              return (
                <button onClick={() => counter.increase()}>
                  {counter.value + count}
                </button>
              );
            }}
          </Observer>
        ) : null}
      </li>
      <li>
        <button onClick={() => setCount((prevCount) => prevCount + 1)}>
          {count}
        </button>
      </li>
    </div>
  );
};
