import logo from "./logo.svg";
import "./App.css";
import { Text, View } from "react-native";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <View
          className="xxx"
          style={{
            flexDirection: "row",
            justifyContent: "center",
          }}
          dataClasss="xxx"
          dataSet={{
            class: "xxx",
          }}
        >
          <Text>1</Text>
          <Text
            className="aaa"
            style={{
              backgroundColor: "red",
              textIndent: 100,
            }}
          >
            123
          </Text>
        </View>
      </header>
    </div>
  );
}

export default App;
