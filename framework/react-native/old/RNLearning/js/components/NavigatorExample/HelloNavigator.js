import React, { Component } from 'react';
import { Text, Navigator } from 'react-native';

export default class HelloNavigator extends Component {

  static title = 'Hello Navigator';
  static description = 'renderScene is Navigator Required function which renders the scene for a given route. Will be invoked with the route and the navigator object.'

  render() {
    return (
      <Navigator
        initialRoute={{ title: 'Hellow Navigator', index: 0 }}
        renderScene={(route, navigator) =>
          <Text>{route.title}!</Text>
        }
        style={{ padding: 100 }}
      />
    );
  }
}
