/* @flow */
import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';

import TimeLog from './components/TimeLog';

class HelloWorld extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Hello, World</Text>
        <TimeLog />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#eee',
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});

export default HelloWorld;
