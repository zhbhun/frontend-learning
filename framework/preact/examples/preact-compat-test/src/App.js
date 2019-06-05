import React from 'react';
import logo from './logo.svg';
import './App.css';

console.log(React.Fragement);

const { createContext } = React;
const themes = {
  light: {
    foreground: '#000000',
    background: '#eeeeee',
  },
  dark: {
    foreground: '#ffffff',
    background: '#222222',
  },
};
const ThemeContext = createContext(
  themes.dark // default value
);

class ThemedButton extends React.Component {
  render() {
    let props = this.props;
    let theme = this.context;
    console.log(theme);
    return (
      <div>
        <ThemeContext.Consumer>
          {theme => (
            <div>
              <p>Selected theme: {JSON.stringify(theme)}</p>
              <button
                {...props}
                style={{backgroundColor: theme.background}}
              />
            </div>
          )}
        </ThemeContext.Consumer>
        <p>Selected theme: {JSON.stringify(theme)}</p>
        <button
          {...props}
          style={{backgroundColor: theme.background}}
        />
      </div>
    );
  }
}
ThemedButton.contextType = ThemeContext;
function Toolbar(props) {
  return (
    <ThemedButton onClick={props.changeTheme}>
      Change Theme
    </ThemedButton>
  );
}


function App() {
  return (
    <div className="App">
      {/* <header className="App-header">
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
      </header> */}
      <ThemeContext.Provider value={themes.dark}>
        <Toolbar changeTheme={undefined} />
      </ThemeContext.Provider>
    </div>
  );
}

export default App;
