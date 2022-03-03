import React, { Component } from 'react';
import { Button } from 'antd';

/*
添加 disabled 属性即可让按钮处于不可用状态，同时按钮样式也会改变。
 */
export default class LoadingButtonDemo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      iconLoading: false,
    };
  }

  enterLoading() {
    this.setState({ loading: true });
  }

  enterIconLoading() {
    this.setState({ iconLoading: true });
  }

  render() {
    return (
      <div>
        <Button type="primary" loading>
          Loading
        </Button>
        <Button type="primary" size="small" loading>
          Loading
        </Button>
        <br />
        <Button type="primary" loading={this.state.loading} onClick={this.enterLoading}>
          Click me!
        </Button>
        <Button type="primary" icon="poweroff" loading={this.state.iconLoading} onClick={this.enterIconLoading}>
          Click me!
        </Button>
      </div>
    );
  }

}
