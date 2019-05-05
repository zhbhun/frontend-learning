/**
 * 测试 setState 的异步更新
 */
import React, { PureComponent } from 'react';
import Logger from '../../../Logger';
import Page from '../../../Page';

const StateExample = Logger.connect(
  class extends PureComponent {
    static contextType = Logger.Context;

    constructor(props) {
      super(props);

      this.state = {
        count: 0,
      };
    }

    handleObjectClick = () => {
      this.setState({ count: this.state.count + 1 });
      this.context.log(`count: ${this.state.count}`);
      this.setState({ count: this.state.count + 1 });
    };

    handleFunctionClick = () => {
      this.setState(state => ({ count: state.count + 1 }));
      this.context.log(`count: ${this.state.count}`);
      this.setState(state => ({ count: state.count + 1 }));
    };

    handleTimeout = () => {
      setTimeout(() => {
        this.setState({ count: this.state.count + 1 });
        this.context.log(`count: ${this.state.count}`);
        this.setState({ count: this.state.count + 1 });
      }, 1000);
    }

    render() {
      this.context.log(`render: ${this.state.count}`);
      return (
        <div>
          <h2>Function VS Object</h2>
          <div>
            count: <span>{this.state.count}</span>
          </div>
          <button onClick={this.handleObjectClick}>
            <span>object</span>
          </button>
          <button onClick={this.handleFunctionClick}>
            <span>function</span>
          </button>
          <button onClick={this.handleTimeout}>
            <span>timeout</span>
          </button>
        </div>
      );
    }
  },
);

export default Page.create({
  path: 'updater',
  title: 'Updater',
})(StateExample);
