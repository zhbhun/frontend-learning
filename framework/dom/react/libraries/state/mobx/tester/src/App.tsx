import { useState } from "react";
import GlobalCounter from "./GlobalCounter";
import LocalCounter from "./LocalCounter";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <div>
        <h2>global counter1</h2>
        <GlobalCounter></GlobalCounter>
      </div>
      <div>
        <h2>global counter2</h2>
        <GlobalCounter></GlobalCounter>
      </div>
      <div>
        <h2>local counter1</h2>
        <LocalCounter></LocalCounter>
      </div>
      <div>
        <h2>local counter2</h2>
        <LocalCounter></LocalCounter>
      </div>
    </div>
  );
}

export default App;
