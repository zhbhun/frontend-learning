import { useState } from "react";
import { signal } from "@preact/signals-react";

const count = signal(0);

function CounterValue() {
  console.log(">>", Date.now());
  return (
    <div>
      <p onClick={() => count.value++}>Value: {count}</p>
    </div>
  );
}

function App() {
  return <CounterValue />;
}

export default App;
