import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Navigator,
  Picker,
} from 'react-native';

export default class StyleTest extends Component {

  static title = 'Style Test';
  static description = 'Navigator style property.';

  state = {
    backgroundColor: null
  };

  render() {
    const {
      layout,
      backgroundColor,
    } = this.state;
    return (
      <Navigator
        initialRoute={{ title: 'Style Test', index: 0 }}
        renderScene={(route, navigator) =>
          <View style={{ backgroundColor: 'gray' }}>
            <Text>{route.title}!</Text>
            <View>
              <Text>background color</Text>
              <Picker
                selectedValue={backgroundColor}
                onValueChange={(backgroundColor) => this.setState({ backgroundColor })}
              >
                <Picker.Item label="default" value="" />
                <Picker.Item label="red" value="red" />
                <Picker.Item label="blue" value="blue" />
              </Picker>
            </View>
          </View>
        }
        style={[
          layout && { justifyContent: layout },
          backgroundColor && { backgroundColor },
        ]}
      />
    );
  }
}

const styles = StyleSheet.create({
  horizontal: {
    flexDirection: 'row',
  },
});
