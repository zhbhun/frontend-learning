import React, { PropTypes, Component } from 'react';

import {
  StyleSheet,
  TouchableHighlight,
  View,
  Text,
} from 'react-native';

class ExampleList extends Component {

  static propTypes = {
    examples: PropTypes.array,
    renderable: PropTypes.bool,
  };

  static contextTypes = {
    push: PropTypes.func,
  };

  static defaultProps = {
    examples: [],
    renderable: true,
  };

  gotoExample = (path) => {
    this.context.push(path);
  }

  render() {
    const { examples, renderable } = this.props;
    if (Array.isArray(examples)) {
      return (
        <View>
          {examples.map(({ path, component }) => {
            const { title, description } = component;
            return (
              <TouchableHighlight
                key={path}
                onPress={() => this.gotoExample(path)}
                style={styles.container}
                underlayColor="#eee"
              >
                <View style={styles.innerContainer}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.description}>{description}</Text>
                </View>
              </TouchableHighlight>
            );
          })}
        </View>
      );
    }
    return null;
  }
}

const styles = {
  container: {
    paddingHorizontal: 16,
  },
  innerContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#777',
  },
};

export default ExampleList;
