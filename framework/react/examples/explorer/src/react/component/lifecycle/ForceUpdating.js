import React, { Component, PureComponent } from 'react';
import Page from '../../../Page';
import Logger from '../../../Logger';

class NewLifecycle extends Component {
  static getDerivedStateFromProps = (props, state) => {
    if (state.mounted) {
      props.log('getDerivedStateFromProps');
    }
    return {};
  };

  constructor(props) {
    super(props);

    this.state = {
      mounted: false,
    };
  }

  componentDidMount() {
    // eslint-disable-next-line
    this.state.mounted = true;
  }

  shouldComponentUpdate(nextProps, nextState) {
    nextProps.log('shouldComponentUpdate');
    return false;
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    this.props.log('getSnapshotBeforeUpdate');
    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    this.props.log('componentDidUpdate');
  }

  handleRef = () => {
    if (this.state.mounted) {
      this.props.log('ref');
    }
  };

  render() {
    if (this.state.mounted) {
      this.props.log('render');
    }
    return <div ref={this.handleRef}>New: from react 16</div>;
  }
}

class OldLifecycle extends Component {
  componentDidMount() {
    this.mounted = true;
  }

  componentWillReceiveProps(nextProps) {
    nextProps.log('componentWillReceiveProps');
  }

  shouldComponentUpdate(nextProps, nextState) {
    nextProps.log('shouldComponentUpdate');
    return false;
  }

  componentWillUpdate(nextProps, nextState) {
    nextProps.log('componentWillUpdate');
  }

  componentDidUpdate(prevProps, prevState) {
    this.props.log('componentDidUpdate');
  }

  handleRef = () => {
    if (this.mounted) {
      this.props.log('ref');
    }
  };

  render() {
    if (this.mounted) {
      this.props.log('render');
    }
    return <div ref={this.handleRef}>Old</div>;
  }
}

class Demo extends PureComponent {
  static contextType = Logger.Context;

  componentDidMount() {
    setTimeout(() => {
      this.component.forceUpdate();
    }, 1000);
  }

  handleRef = (ref) => {
    this.component = ref;
  }

  render() {
    const { log } = this.context;
    const { Componenet } = this.props;
    return <Componenet ref={this.handleRef} log={log} />;
  }
}

const DemoWithLogger = Logger.connect(Demo);

const PropsUpdating = () => (
  <div>
    <DemoWithLogger Componenet={NewLifecycle} />
    <DemoWithLogger Componenet={OldLifecycle} />
  </div>
);

export default Page.create({
  path: 'force-updating',
  title: 'Force Updating',
})(PropsUpdating);
