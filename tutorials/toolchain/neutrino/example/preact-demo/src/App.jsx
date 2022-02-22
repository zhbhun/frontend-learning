import { h, Component } from 'preact';
import './App.css';

export default class App extends Component {
  state = {
    name: 'preact-demo',
  };

  render() {
    const { name } = this.state;
    return (
      <div className="App">
        <h1>
          Welcome to
          {name}
        </h1>
      </div>
    );
  }
}
