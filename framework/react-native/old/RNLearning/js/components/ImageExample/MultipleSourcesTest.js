import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
} from 'react-native';

export default class MultipleSourcesTest extends React.Component {

  static title = 'Multiple Sources Test';

  state = {
    width: 30,
    height: 30,
  };

  render() {
    return (
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text
            style={styles.touchableText}
            onPress={this.decreaseImageSize}
          >
            Decrease image size
          </Text>
          <Text
            style={styles.touchableText}
            onPress={this.increaseImageSize}
          >
            Increase image size
          </Text>
        </View>
        <Text>Container image size: {this.state.width}x{this.state.height} </Text>
        <View style={{height: this.state.height, width: this.state.width }}>
          <Image
            style={{ flex: 1 }}
            source={[
              { uri: 'https://facebook.github.io/react/img/logo_small.png', width: 38, height: 38 },
              { uri: 'https://facebook.github.io/react/img/logo_small_2x.png', width: 76, height: 76 },
              { uri: 'https://facebook.github.io/react/img/logo_og.png', width: 400, height: 400 }
            ]}
          />
        </View>
      </View>
    );
  }

  increaseImageSize = () => {
    if (this.state.width > 100) {
      return;
    }
    this.setState({
      width: this.state.width + 10,
      height: this.state.height + 10,
    });
  }

  decreaseImageSize = () => {
    if (this.state.width <= 10) {
      return;
    }
    this.setState({
      width: this.state.width - 10,
      height: this.state.height - 10,
    });
  }

}

const styles = StyleSheet.create({
  touchableText: {
    fontWeight: '500',
    color: 'blue',
  },
});
