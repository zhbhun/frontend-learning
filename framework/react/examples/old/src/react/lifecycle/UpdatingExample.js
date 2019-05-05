import React, { Component } from "react";

class StateUpdatingExample extends Component {
  static count = 0;
  static logs = [];
  static getDerivedStateFromProps = (props, state) => {
    if (state.updating) {
      StateUpdatingExample.count = StateUpdatingExample.count + 1;
      StateUpdatingExample.logs = [
        ...StateUpdatingExample.logs,
        `getDerivedStateFromProps: ${StateUpdatingExample.count}`
      ];
    }
    return null;
  };

  constructor(props) {
    super(props);

    this.state = {
      updating: false
    };
  }

  componentDidMount() {
    this.setState({ updating: true });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.updating) {
      StateUpdatingExample.count = StateUpdatingExample.count + 1;
      StateUpdatingExample.logs = [
        ...StateUpdatingExample.logs,
        `shouldComponentUpdate: ${StateUpdatingExample.count}`
      ];
    }
    return true;
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    StateUpdatingExample.count = StateUpdatingExample.count + 1;
    StateUpdatingExample.logs = [
      ...StateUpdatingExample.logs,
      `getSnapshotBeforeUpdate: ${StateUpdatingExample.count}`
    ];
    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.updating) {
      StateUpdatingExample.count = StateUpdatingExample.count + 1;
      StateUpdatingExample.logs = [
        ...StateUpdatingExample.logs,
        `componentDidUpdate: ${StateUpdatingExample.count}`
      ];
      this.setState({ updating: false });
    }
  }

  render() {
    if (this.state.updating) {
      StateUpdatingExample.count = StateUpdatingExample.count + 1;
      StateUpdatingExample.logs = [
        ...StateUpdatingExample.logs,
        `render: ${StateUpdatingExample.count}`
      ];
    }
    return (
      <div>
        <h2>Local Updating</h2>
        <ul>
          {StateUpdatingExample.logs.map(log => <li key={log}>{log}</li>)}
        </ul>
      </div>
    );
  }
}

class MountingExample extends Component {
  render = () => (
    <div>
      <StateUpdatingExample />
    </div>
  );
}

export default MountingExample;
