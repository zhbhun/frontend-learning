```js
import { render } from "solid-js/web";
import { createMemo, createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(0);

  const doubleCount = count() * 2

  // 适用于一次性使用，无需复用
  const trippleCount = () => count() * 3; 

  // 最佳，可供多处复用计算结果值
  const quadrupleCount = createMemo(() => {
      return count() * 4
  });

  // DOM 节点反复构造，有点浪费性能，再需要多处复用 DOM 节点时才使用
  const quintupleCount = createMemo(() => {
    const currentCount = count() * 5
    return <div>{currentCount}</div>
  })

  // 同上，还是存在类似问题
  const sextupleCount1 = () => {
    const currentCount = count() * 6
    return <div>{currentCount}</div>
  }

  // 最佳，满足复用的同时确保性能
  const sextupleCount2 = () => {
    return <div>{count() * 6}</div>
  }


  setInterval(() => setCount(count() + 1), 1000);

  return (
    <div>
      <div>Count: {count()}</div>
      <div>Double Count: {doubleCount}</div>
      <div>Tripple Count: {trippleCount()}</div>
      <div>Quadruple Count: {quadrupleCount()}</div>
      <div>Quintuple Count: {quintupleCount()}</div>
      <div>Sextuple Count: {sextupleCount1()}</div>
      <div>Sextuple Count: {sextupleCount2()}</div>
    </div>
  );
}

render(() => <Counter />, document.getElementById('app'));
```
