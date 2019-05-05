import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Navigator,
  Picker,
} from 'react-native';

export default class SceneStyleTest extends Component {

  static title = 'Scene Style Test';
  static description = 'Styles to apply to the container of each scene.'

  state = {
    layout: undefined,
    backgroundColor: null
  };

  render() {
    const {
      layout,
      backgroundColor,
    } = this.state;
    return (
      <Navigator
        initialRoute={{ title: 'Scene Style Test', index: 0 }}
        renderScene={(route, navigator) =>
          <View style={{ backgroundColor: 'gray' }}>
            <Text>{route.title}!</Text>
            <View>
              <Text>layout</Text>
              <Picker
                selectedValue={layout}
                onValueChange={(layout) => this.setState({ layout })}
              >
                <Picker.Item label="default" value="" />
                <Picker.Item label="flex-start" value="flex-start" />
                <Picker.Item label="center" value="center" />
              </Picker>
            </View>
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
        sceneStyle={[
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
