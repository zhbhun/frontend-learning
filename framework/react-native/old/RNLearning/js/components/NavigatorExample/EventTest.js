import React, { Component } from 'react';
import { View, Text, Navigator, TouchableHighlight } from 'react-native';

const routes = [
  { title: 'First Scene', index: 0 },
  { title: 'Second Scene', index: 1 },
  { title: 'Third Scene', index: 2 },
];

export default class EventTest extends Component {

  static title = 'Event Test';

  componentWillUnmount() {
    this._listeners && this._listeners.forEach(listener => listener.remove());
  }

  _setNavigatorRef = (navigator) => {
    if (navigator !== this._navigator) {
      this._navigator = navigator;

      if (navigator) {
        var callback = (event) => {
          console.warn(
            `TabBarExample: event ${event.type}`,
            JSON.stringify({
              route: JSON.stringify(event.data.route),
              // target: event.target,
              type: event.type,
            })
          );
        };
        // Observe focus change events from the owner.
        this._listeners = [
          navigator.navigationContext.addListener('willfocus', callback),
          navigator.navigationContext.addListener('didfocus', callback),
        ];
      }
    }
  };

  render() {
    return (
      <Navigator
        ref={this._setNavigatorRef}
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
      />
    );
  }

}
