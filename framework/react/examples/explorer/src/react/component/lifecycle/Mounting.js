import React, { PureComponent } from 'react';
import Page from '../../../Page';
import Logger from '../../../Logger';

class NewLifecycle extends PureComponent {
  static getDerivedStateFromProps = (props, state) => {
    props.log('getDerivedStateFromProps');
    return {};
  };

  constructor(props) {
    super(props);

    props.log('constructor');
    this.state = {};
  }

  componentDidMount() {
    this.props.log('componentDidMount');
  }

  handleRef = () => {
    this.props.log('ref');
  };

  render() {
    this.props.log('render');
    return <div ref={this.handleRef}>New: from react 16</div>;
  }
}

class OldLifecycle extends PureComponent {
  constructor(props) {
    super(props);

    props.log('constructor');
    this.state = {};
  }

  componentWillMount() {
    this.props.log('componentWillMount');
  }

  componentDidMount() {
    this.props.log('componentDidMount');
  }

  handleRef = () => {
    this.props.log('ref');
  };

  render() {
    this.props.log('render');
    return <div ref={this.handleRef}>Old</div>;
  }
}

class Demo extends PureComponent {
  static contextType = Logger.Context;

  render() {
    const { log } = this.context;
    const { Componenet } = this.props;
    return <Componenet log={log} />;
  }
}

const DemoWithLogger = Logger.connect(Demo);

const MountingExample = () => (
  <div>
    <DemoWithLogger Componenet={NewLifecycle} />
    <DemoWithLogger Componenet={OldLifecycle} />
  </div>
);

export default Page.create({
  path: 'mounting',
  title: 'Mounting',
})(MountingExample);
