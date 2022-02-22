/**
 * 问题：测试不同组件实例复用 ref 的问题
 *
 * 总结：调整组件结构不会影响 ref 的引用值变化
 */
import React, { PureComponent } from 'react';

const refs = {};
const dom = {};

class Item extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      clickd: false,
    };
    this.value = this.props.value;
  }

  handleRef = (ref) => {
    const { index, value } = this.props;
    console.log(index, value, ref, ref === dom[index]);
    if (ref) {
      dom[index] = ref;
    }
  }

  handleClick = () => {
    this.setState({ clicked: true });
  }

  render() {
    return (
      <li
        ref={this.handleRef}
        onClick={this.handleClick}
      >
        {this.state.clicked ? 'clicked' : 'unclick'}
        {this.props.index}
        {'-'}
        {this.props.value}
      </li>
    );
  }
}

class Demo extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      visible: false,
    };
  }

  handleSwitch = () => {
    this.setState({ visible: !this.state.visible });
  }

  render = () => {
    const { visible } = this.state;
    let value = 1;
    return (
      <ul>
        <button onClick={this.handleSwitch}>switch</button>
        {visible ? (
          <Item index={0} value={0} />
        ) : null}
        <Item index={1} value={value++} />
        <Item index={2} value={value++} />
        <Item index={3} value={value++} />
      </ul>
    )
  }
}

export default Demo;
