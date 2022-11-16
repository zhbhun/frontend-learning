
import React, { PureComponent } from 'react';

console.log('reload');

export default class Test extends PureComponent {
  static getInitialProps = () => {
    console.log('getInitialProps');
    return {};
  };

  constructor(props) {
    super(props);

    this.state = { count: 0 };
    console.log('reconstructor');
  }

  componentWillUnmount() {
    console.log('unmount');
  }

  render() {
    return (
      <div onClick={() => this.setState({ count: this.state.count + 1 })}>
        Count: {this.state.count}
      </div>
    );
  }
}
