/**
 * 问题：重新渲染是否会重复调用 ref
 *
 * 总结：
 *
 * 1. 父组件的重新渲染（属性或者状态变更）不会引起组件的 ref 重复调用
 * 2. 组件的属性变更不会引起 ref 的重复调用
 * 3. 组件的 ref 属性变更（匿名函数）会引起 ref 的重复调用，一次重新渲染会给前一个 ref 函数传递 null，给后一个 ref 函数传组件实例
 */
import React, { PureComponent } from 'react';

const refs = {};
const dom = {};

// 组件容器状态和属性变化
class Item1 extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      clicked: false,
    };
    this.value = this.props.value;
  }

  handleRef = (ref) => {
    console.log(1, ref);
  }

  handleClick = () => {
    this.setState({ clicked: true });
  }

  render() {
    return (
      <div ref={this.handleRef} onClick={this.handleClick}>
        {this.state.clicked ? 'clicked' : 'unclick'}
        {this.props.count}
      </div>
    );
  }
}

// 组件属性变化
class Item2 extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      clicked: false,
    };
    this.value = this.props.value;
  }

  handleRef = (ref) => {
    console.log(2, ref);
  }

  handleClick = () => {
    this.setState({ clicked: true });
  }

  render() {
    const { count } = this.props;
    return (
      <div id={count} ref={this.handleRef} onClick={this.handleClick}>
        {this.state.clicked ? 'clicked' : 'unclick'}
        {count}
      </div>
    );
  }
}


// ref 调整
class Item3 extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      clicked: false,
    };
    this.value = this.props.value;
  }

  handleRef1 = (ref) => {
    console.log(3, 1, ref)
  }

  handleRef2 = (ref) => {
    console.log(3, 2, ref)
  }

  handleClick = () => {
    this.setState({ clicked: true });
  }

  render() {
    const { count } = this.props;
    const { clicked } = this.state;
    return (
      <div
        ref={clicked ? this.handleRef2 : this.handleRef1}
        onClick={this.handleClick}
      >
        {clicked ? 'clicked' : 'unclick'}
        {count}
      </div>
    );
  }
}


class Demo extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      count: 1,
    };
  }

  handleAdd = () => {
    this.setState({
      count: this.state.count + 1,
    });
  }

  render = () => {
    return (
      <div>
        <Item1 count={this.state.count} />
        <Item2 count={this.state.count} />
        <Item3 count={this.state.count} />
        <button onClick={this.handleAdd}>add</button>
      </div>
    )
  }
}

export default Demo;
