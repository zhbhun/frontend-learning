// @flow
import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';

import Router from './utils/Router';
import Navbar from './utils/Navbar';
import ExampleList from './utils/ExampleList';

import routes from './routes';

class App extends Component {
  render = () => {
    return (
      <View>
        <Navbar
          title={{
            title: "React Native Explorer",
          }}
        />
        {this.renderCategoryList()}
      </View>
    );
  }

  renderCategoryList = () => {
    const { route } = this.props;
    const { childRoutes } = route;
    return (childRoutes || []).map((childRoute) => {
      const { path, component, childRoutes: examples } = childRoute;
      const { title, description } = component;
      return (
        <View key={path}>
          <View style={styles.categoryTitle}>
            <Text>{title || ''}</Text>
            <Text>{description || ''}</Text>
          </View>
          <ExampleList
            examples={examples}
            renderable={false}
          />
        </View>
      );
    })
  }
}

const styles = StyleSheet.create({
  categoryTitle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ccc',
  },
});

export default App;
