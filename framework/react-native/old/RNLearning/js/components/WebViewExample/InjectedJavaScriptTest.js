import React from 'react';
import {
  StyleSheet,
  View,
  Text,
} from 'react-native';
import HTMLStaticTest from './HTMLStaticTest';

export default class InjectedJavaScriptTest extends React.Component {

  static title = 'InjectedJavaScript Test'

  state = {
    script: 'alert(1)',
  };

  updateScript = () => {
    this.setState({
      script: 'alert(2)',
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <View>
          <Text>update script</Text>
        </View>
        <HTMLStaticTest
          injectedJavaScript={this.state.script}
        />
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
