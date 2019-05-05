import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Image,
  Text,
  ActivityIndicator,
} from 'react-native';

const IMAGE_URL = 'https://facebook.github.io/react/img/logo_small_2x.png';

export default class EventTest extends React.Component {

  static title = 'Event Test';

  state = {
    // event
    events: {},
    mountTime: new Date(),
    // progress
    error: false,
    loading: false,
    progress: 0
  };

  componentWillMount() {
    this.setState({ mountTime: new Date() });
  }

  _loadNormalEventFired = (title, event) => {
    this.setState((state) => {
      return state.events[title] = [...(state.events[title] || []), event];
    });
  }

  renderEventDemo = (title, source) => {
    const { mountTime } = this.state;
    return (
      <View style={styles.demo}>
        <Text style={styles.title}>{title}</Text>
        <Image
          source={{ uri: source }}
          style={[styles.base, { overflow: 'visible' }]}
          onLoadStart={() => this._loadNormalEventFired(title, `✔ onLoadStart (+${new Date() - mountTime}ms)`)}
          onLoad={(event) => {
            // Currently this image source feature is only available on iOS.
            if (event.nativeEvent.source) {
              const url = event.nativeEvent.source.url;
              this._loadNormalEventFired(title, `✔ onLoad (+${new Date() - mountTime}ms) for URL ${url}`);
            } else {
              this._loadNormalEventFired(title, `✔ onLoad (+${new Date() - mountTime}ms)`);
            }
          }}
          onError={(event) => {
            this._loadNormalEventFired(title, `✔ onError (+${new Date() - mountTime}ms)`);
          }}
          onLoadEnd={() => {
            this._loadNormalEventFired(title, `✔ onLoadEnd (+${new Date() - mountTime}ms)`);
          }}
        />
        <Text style={{marginTop: 20}}>
          {(this.state.events[title] || []).join('\n')}
        </Text>
      </View>
    );
  }

  renderProgress = (uri) => {
    var loader = this.state.loading && this.state.progress ?
      <View style={styles.progress}>
        <Text>{this.state.progress}%</Text>
        <ActivityIndicator style={{ marginLeft:5 }} />
      </View> : null;
    return (
      <View style={styles.demo}>
        <Text style={styles.title}>Progress</Text>
        <Image
          source={{ uri }}
          style={[styles.base, { overflow: 'visible' }]}
          onLoadStart={(e) => this.setState({ loading: true })}
          onProgress={(e) => this.setState({ progress: Math.round(100 * e.nativeEvent.loaded / e.nativeEvent.total) })}
          onLoad={() => this.setState({ loading: false, error: false })}
          onError={(e) => this.setState({ error: e.nativeEvent.error, loading: false })}
        >
          {loader}
        </Image>
      </View>
    );
  }

  render = () => {
    return (
      <View>
        {this.renderEventDemo('Normal', IMAGE_URL)}
        {this.renderEventDemo('Error', 'xxx')}
        {Platform.OS === 'ios' && this.renderProgress(IMAGE_URL)}
      </View>
    );
  }

}

var styles = StyleSheet.create({
  base: {
    width: 38,
    height: 38,
  },
  demo: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  title: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
