import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  WebView,
} from 'react-native';

const BGWASH = 'rgba(255,255,255,0.8)';

export default class ScaleTest extends React.Component {

  static title = 'Scale Page to Fit';

  state = {
    scalingEnabled: true,
  };

  render() {
    return (
      <View style={styles.container}>
        <WebView
          style={styles.webview}
          source={{uri: 'https://github.com/'}}
          scalesPageToFit={this.state.scalingEnabled}
        />
        <View style={styles.buttons}>
        { this.state.scalingEnabled ?
          <Button
            text="Scaling:ON"
            enabled={true}
            onPress={() => this.setState({scalingEnabled: false})}
          /> :
          <Button
            text="Scaling:OFF"
            enabled={true}
            onPress={() => this.setState({scalingEnabled: true})}
          /> }
        </View>
      </View>
    );
  }
}

class Button extends React.Component {
  _handlePress = () => {
    if (this.props.enabled !== false && this.props.onPress) {
      this.props.onPress();
    }
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={this._handlePress}>
        <View style={styles.button}>
          <Text>{this.props.text}</Text>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    backgroundColor: BGWASH,
  },
  buttons: {
    flexDirection: 'row',
    height: 30,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    flex: 0.5,
    width: 0,
    margin: 5,
    borderColor: 'gray',
    borderWidth: 1,
    backgroundColor: 'gray',
  },
});
