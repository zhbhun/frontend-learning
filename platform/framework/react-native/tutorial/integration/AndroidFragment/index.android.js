/* @flow */
import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import HelloWorld from './js/HelloWorld';
import NotFound from './js/NotFound';

class App extends React.Component {
  render() {
    const { page = '/helloworld' } = this.props;
    let pageElement = null;
    if (page === '/helloworld') {
      pageElement = <HelloWorld />;
    } else if (page === '/404') {
      pageElement = <NotFound />;
    }
    return (
      <View style={styles.container}>
        {pageElement}
      </View>
    )
  }
}
var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

AppRegistry.registerComponent('app', () => App);
