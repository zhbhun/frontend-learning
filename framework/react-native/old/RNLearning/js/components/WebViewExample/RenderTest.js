import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  WebView,
  ActivityIndicator,
} from 'react-native';

const BGWASH = 'rgba(255,255,255,0.8)';

export default class RenderTest extends React.Component {

  static title = 'Render Test';

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.demoContainer}>
          <Text>startInLoadingState</Text>
          <WebView
            style={styles.webview}
            source={{uri: 'https://github.com/'}}
            startInLoadingState={true}
          />
        </View>
        <View style={styles.demoContainer}>
          <Text>renderLoading</Text>
          <WebView
            style={styles.webview}
            source={{uri: 'https://github.com/'}}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator
                animating
                size="large"
                color="red"
              />
            )}
          />
        </View>
        <View style={styles.demoContainer}>
          <Text>renderError</Text>
          <WebView
            style={styles.webview}
            source={{uri: 'https://git1hub.com/'}}
            startInLoadingState={true}
            renderError={() => (
              <Text>
                加载失败
              </Text>
            )}
          />
        </View>
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  demoContainer: {
    flex: 1,
  },
  webview: {
    backgroundColor: BGWASH,
  },
});
