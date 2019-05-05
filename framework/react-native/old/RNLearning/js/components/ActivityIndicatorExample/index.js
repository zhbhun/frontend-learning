import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';

/**
 * Optional Flowtype state and timer types definition
 */
type State = { animating: boolean; };
type Timer = number;

class ToggleAnimatingActivityIndicator extends Component {
  /**
   * Optional Flowtype state and timer types
   */
  state: State;
  _timer: Timer;

  constructor(props) {
    super(props);
    this.state = {
      animating: true,
    };
  }

  componentDidMount() {
    this.setToggleTimeout();
  }

  componentWillUnmount() {
    clearTimeout(this._timer);
  }

  setToggleTimeout() {
    this._timer = setTimeout(() => {
      this.setState({ animating: !this.state.animating });
      this.setToggleTimeout();
    }, 2000);
  }

  render() {
    return (
      <ActivityIndicator
        animating={this.state.animating}
        style={[styles.centering, { height: 80 }]}
        size="large"
      />
    );
  }
}

// export const displayName = (undefined: ?string);

export const framework = 'React';

export const title = '<ActivityIndicator>';

export const description = 'Displays a circular loading indicator';

export const examples = [
  {
    title: 'Default',
    description: 'Android: size=small, color=green, justifyContent=center, alignItems=center, \niOS: ?',
    render() {
      return (
        <View>
          <ActivityIndicator />
          <ActivityIndicator style={{ height: 50, backgroundColor: 'red' }} />
        </View>
      );
    },
  },
  {
    title: 'Custom colors',
    render() {
      return (
        <View style={styles.horizontal}>
          <ActivityIndicator color="#0000ff" />
          <ActivityIndicator color="#aa00aa" />
          <ActivityIndicator color="#aa3300" />
          <ActivityIndicator color="#00aa00" />
        </View>
      );
    },
  },
  {
    title: 'Large',
    render() {
      return (
        <ActivityIndicator
          style={[styles.centering, styles.gray]}
          size="large"
          color="white"
        />
      );
    },
  },
  {
    title: 'Large, custom colors',
    render() {
      return (
        <View style={styles.horizontal}>
          <ActivityIndicator
            size="large"
            color="#0000ff"
          />
          <ActivityIndicator
            size="large"
            color="#aa00aa"
          />
          <ActivityIndicator
            size="large"
            color="#aa3300"
          />
          <ActivityIndicator
            size="large"
            color="#00aa00"
          />
        </View>
      );
    },
  },
  {
    title: 'Custom size (transform)',
    render() {
      return (
        <ActivityIndicator
          style={[styles.centering, { transform: [{ scale: 1.5 }] }]}
          size="large"
        />
      );
    },
  },
  {
    platform: 'android',
    title: 'Custom size (size: 75)',
    render() {
      return (
        <ActivityIndicator
          style={styles.centering}
          size={75}
        />
      );
    },
  },
  {
    title: 'Start/stop',
    render() {
      return <ToggleAnimatingActivityIndicator />;
    },
  },
];

const styles = StyleSheet.create({
  centering: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  gray: {
    backgroundColor: '#cccccc',
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
  },
});
