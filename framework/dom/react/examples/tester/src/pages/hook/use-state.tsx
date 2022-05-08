import { useState } from "react";

function UseStateTester() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
