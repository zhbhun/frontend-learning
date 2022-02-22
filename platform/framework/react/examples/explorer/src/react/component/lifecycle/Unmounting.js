import React, { PureComponent } from 'react';
import Logger from '../../../Logger';

class Demo extends PureComponent {
  static contextType = Logger.Context;

  componentWillMount() {
    this.context.log(`${this.props.id}: componentWillMount`);
  }

  componentDidMount() {
    this.context.log(`${this.props.id}: componentDidMount`);
  }

  componentWillUnmount() {
    this.context.log(`${this.props.id}: componentWillUnmount`);
  }

  handleRef = (ref) => {
    this.context.log(`${this.props.id}: ref`);
  }

  render() {
    return <div ref={this.handleRef}>{this.props.id}</div>;
  }
}

class UnmountingExample extends PureComponent {
  static path = 'unmounting';

  static title = 'Unmounting';

  constructor(props) {
    super(props);

    this.state = {
      count: 0,
    };
    this.mounted = false;
  }

  componentDidMount() {
    this.mounted = true;
    setTimeout(() => {
      if (this.mounted) {
        this.setState(state => ({ count: state.count + 1 }));
      }
    }, 1000);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    return (
      <Logger>
        <div>
          <Demo key={this.state.count} id={this.state.count} />
        </div>
      </Logger>
    );
  }
}

export default UnmountingExample;
