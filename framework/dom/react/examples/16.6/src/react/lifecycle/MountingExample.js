import React, { Component } from "react";

class NewMountingExample extends Component {
  static getDerivedStateFromProps = (props, state) => {
    const newCount = state.count + 1;
    return {
      count: newCount,
      logs: [...state.logs, `getDerivedStateFromProps: ${newCount}`]
    };
  };

  constructor(props) {
    super(props);

    this.state = {
      count: 0,
      logs: [`constructor: ${0}`]
    };
  }

  componentDidMount() {
    const newCount = this.state.count + 1;
    this.setState({
      count: newCount,
      logs: [...this.state.logs, `componentDidMount: ${newCount}`]
    });
  }

  render() {
    const newCount = this.state.count + 1;
    this.state = {
      count: newCount,
      logs: [...this.state.logs, `render: ${newCount}`]
    };
    return (
      <div>
        <h2>New API</h2>
        <ul>{this.state.logs.map(log => <li key={log}>{log}</li>)}</ul>
      </div>
    );
  }
}

class OldMountingExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      count: 0,
      logs: [`constructor: ${0}`]
    };
  }

  componentWillMount() {
    const newCount = this.state.count + 1;
    this.setState({
      count: newCount,
      logs: [...this.state.logs, `componentWillMount: ${newCount}`]
    });
  }

  componentDidMount() {
    const newCount = this.state.count + 1;
    this.setState({
      count: newCount,
      logs: [...this.state.logs, `componentDidMount: ${newCount}`]
    });
  }

  render() {
    const newCount = this.state.count + 1;
    this.state = {
      count: newCount,
      logs: [...this.state.logs, `render: ${newCount}`]
    };
    return (
      <div>
        <h2>OLD API</h2>
        <ul>{this.state.logs.map(log => <li key={log}>{log}</li>)}</ul>
      </div>
    );
  }
}

class MountingExample extends Component {
  render = () => (
    <div>
      <NewMountingExample />
      <OldMountingExample />
    </div>
  );
}

export default MountingExample;
