import React, { Component } from 'react';
import { View, Text, Navigator, TouchableHighlight } from 'react-native';

const routes = [
  { title: 'First Scene', index: 0 },
  { title: 'Second Scene', index: 1 },
  { title: 'Third Scene', index: 2 },
];

class InitialRouteTest extends Component {

  static title = 'Initial Route Test';
  static description = 'The initial route for navigation. A route is an object that the navigator will use to identify each scene it renders.';

  render() {
    return (
      <Navigator
        initialRoute={{ title: 'Initial Route Test', index: 0 }}
        renderScene={(route, navigator) =>
          <Text>{route.title}!</Text>
        }
        style={{ padding: 100 }}
      />
    );
  }

}

class InitialRouteStackStack extends Component {

  static title = 'Initial Route Stack Test';
  static description = 'Pass this in to provide a set of routes to initially mount. This prop is required if initialRoute is not provided to the navigator. If this prop is not passed in, it will default internally to an array containing only initialRoute.';

  render() {
    return (
      <Navigator
        initialRouteStack={routes}
        renderScene={(route, navigator) =>
          <View>
            <Text>Hello {route.title}!</Text>
            {
              route.index > 0 ?
                <TouchableHighlight onPress={() => {
                  navigator.pop();
                }}>
                  <Text>Pop</Text>
                </TouchableHighlight> :
                null
            }
            {
              route.index < routes.length - 1 ?
                <TouchableHighlight onPress={() => {
                  navigator.push(routes[route.index + 1]);
                }}>
                  <Text>Push</Text>
                </TouchableHighlight> :
                null
            }
          </View>
        }
        style={{padding: 100}}
      />
    );
  }

}

class InitialRouteInStackStack extends Component {

  static title = 'Initial Route In Stack Test';

  render() {
    return (
      <Navigator
        initialRoute={routes[1]}
        initialRouteStack={routes}
        renderScene={(route, navigator) =>
          <View>
            <Text>Hello {route.title}!</Text>
            {
              route.index > 0 ?
                <TouchableHighlight onPress={() => {
                  navigator.pop();
                }}>
                  <Text>Pop</Text>
                </TouchableHighlight> :
                null
            }
            {
              route.index < routes.length - 1 ?
                <TouchableHighlight onPress={() => {
                  navigator.push(routes[route.index + 1]);
                }}>
                  <Text>Push</Text>
                </TouchableHighlight> :
                null
            }
          </View>
        }
        style={{padding: 100}}
      />
    );
  }

}

export default {
  title: 'Route Test',
  description: 'A route is an object that the navigator will use to identify each scene it renders.',
  examples: [
    InitialRouteTest,
    InitialRouteStackStack,
    InitialRouteInStackStack
  ],
}
