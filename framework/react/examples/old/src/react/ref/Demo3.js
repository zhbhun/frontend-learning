/**
 * 问题：测试组件 key 值对 ref 引用值的变化
 *
 * 总结：ref 跟随 key 值对应的组件绑定（ref 不会重复调用）。如果一个列表使用了数组 index 作为 key 值，可能导致组件属性和内部状态与 ref 不匹配（例如每个组件接受某个 id 的业务数据，且内部维护了个点击状态和获取了组件引用，这时候列表开头插入一个元素，导致组件的 id 值发生了变化，这时候需要对应组件在接受新属性的时候重置状态）
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
    let key = 1;
    let value = 1;
    return (
      <ul>
        <button onClick={this.handleSwitch}>switch</button>
        {visible ? (
          <Item key={key++} index={0} value={0} />
        ) : null}
        <Item key={key++} index={1} value={value++} />
        <Item key={key++} index={2} value={value++} />
        <Item key={key++} index={3} value={value++} />
      </ul>
    )
  }
}

export default Demo;
