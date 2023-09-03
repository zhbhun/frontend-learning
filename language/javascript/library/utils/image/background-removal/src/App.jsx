import { useRef, useState } from "react";
import imglyRemoveBackground from "@imgly/background-removal";
import "./App.css";

function App() {
  const [result, setResult] = useState("");
  const inputRef = useRef();
  const handleSubmit = (event) => {
    event.preventDefault();
    const file = inputRef.current && inputRef.current.files[0];
    if (file) {
      imglyRemoveBackground(file, {
        publicPath: "/node_modules/@imgly/background-removal/dist/",
      }).then((blob) => {
        const url = URL.createObjectURL(blob);
        setResult(url);
      });
      console.log(inputRef.current);
    }
  };
  return (
    <div>
      {result ? <img className="result" src={result} /> : null}
      <form>
        <input ref={inputRef} type="file" />
        <button onClick={handleSubmit}>Submit</button>
      </form>
    </div>
  );
}

export default App;
