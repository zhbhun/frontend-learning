import React, { createContext, PureComponent } from 'react';

const Context = createContext({
  log: () => null,
});

class Logger extends PureComponent {
  static Context = Context;

  static connect = LoggerWrappedComponent => {
    const LoggerWrapperComponent = props => (
      <Logger>
        <LoggerWrappedComponent {...props} />
      </Logger>
    );
    return LoggerWrapperComponent;
  };

  constructor(props) {
    super(props);

    this.state = {
      logs: [],
    };
    this.value = {
      log: this.handleLog,
    };
    this.timer = null;
    this.cache = [];
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  handleLog = log => {
    if (!this.timer && this.mounted) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.setState(state => ({ logs: [...state.logs, ...this.cache] }));
        this.cache = [];
      }, 300);
    }
    this.cache.push(log);
  };

  render() {
    return (
      <Context.Provider value={this.value}>
        {this.props.children}
        <ul>
          {this.state.logs.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      </Context.Provider>
    );
  }
}

export default Logger;
