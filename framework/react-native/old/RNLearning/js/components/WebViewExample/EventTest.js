import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  WebView,
} from 'react-native';

const ignoreEventProperties = [
  '_targetInst',
  'dispatchConfig',
  'type',
  'target',
  'currentTarget',
  'eventPhase',
  'bubbles',
  'cancelable',
  'timeStamp',
  'defaultPrevented',
  'isTrusted',
  'isDefaultPrevented',
  'isPropagationStopped',
  '_dispatchListeners',
  '_dispatchInstances',
];
const WEBVIEW_REF = 'webview';
const INIT_URL = 'https://github.com/';

export default class EventTest extends React.Component {

  static title = 'Event Test';

  constructor(props) {
    super(props);

    this.state = {
      logs: [],
    };

    this.logError = this.logError.bind(this);
    this.logLoad = this.logLoad.bind(this);
    this.logLoadEnd = this.logLoadEnd.bind(this);
    this.logLoadStart = this.logLoadStart.bind(this);
    this.logMessage = this.logMessage.bind(this);
    this.logNavigationStateChange = this.logNavigationStateChange.bind(this);
    this.logProps = {
      onError: this.logError,
      onLoad: this.logLoad,
      onLoadEnd: this.logLoadEnd,
      onLoadStart: this.logLoadStart,
      onMessage: this.logMessage,
      onNavigationStateChange: this.logNavigationStateChange,
      onShouldStartLoadWithRequest: this.logShouldStartLoadWithRequest,
    };

    this.clearLog = this.clearLog.bind(this);
    this.goForward = this.goForward.bind(this);
    this.goBack = this.goBack.bind(this);

    this.monitorCache = this.monitorCache.bind(this);
    this.unMonitorCache = this.unMonitorCache.bind(this);

    this.cache = [];
    this.cacheMonitor = null;
  }

  componentDidMount() {
    this.monitorCache();
  }

  componentWillUnmount() {
    this.unMonitorCache();
  }

  monitorCache() {
    this.cacheMonitor = setInterval(() => {
      if (Array.isArray(this.cache) && this.cache.length > 0) {
        this.setState({
          logs: [...this.state.logs, ...this.cache],
        });
        this.cache = [];
      }
    }, 1000);
  }

  unMonitorCache() {
    if (this.cacheMonitor) {
      clearInterval(this.cacheMonitor);
      this.cacheMonitor = null;
    }
  }

  stringify(evt) {
    const properties = [];
    Object.keys(evt).forEach((key) => {
      if (ignoreEventProperties.indexOf(key) < 0) {
        properties.push(`${key}=${JSON.stringify(evt[key])}`);
      }
    });
    return properties.join(', ');
  }

  addLog(type, log) {
    this.cache.push(`${type} - ${this.stringify(log)}`);
  }

  logError(evt) {
    this.addLog('error', evt);
  }

  logLoad(evt) {
    this.addLog('load', evt);
  }

  logLoadEnd(evt) {
    this.addLog('loadEnd', evt);
  }

  logLoadStart(evt) {
    this.addLog('loadStart', evt);
  }

  logMessage(evt) {
    this.addLog('loadMessage', evt);
  }

  logNavigationStateChange(evt) {
    this.addLog('NavigationStateChange', evt);
  }

  logShouldStartLoadWithRequest(evt) {
    this.addLog('ShouldStartLoadWithRequest', evt);
    return true;
  }

  clearLog() {
    this.cache = [];
    this.setState({ logs: [] });
  }

  goBack = () => {
    this.refs[WEBVIEW_REF].goBack();
  };

  goForward = () => {
    this.refs[WEBVIEW_REF].goForward();
  };

  renderInitWebView() {
    return (
      <WebView
        {...this.logProps}
        ref={WEBVIEW_REF}
        automaticallyAdjustContentInsets={false}
        source={{ uri: INIT_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        decelerationRate="normal"
        startInLoadingState={true}
      />
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.operateBar}>
          <Text onPress={this.clearLog}>清空日志</Text>
          <Text onPress={this.goBack}>返回</Text>
          <Text onPress={this.goForward}>前进</Text>
        </View>
        <View style={styles.webviewWrapper}>
          {this.renderInitWebView()}
        </View>
        <View style={styles.logWrapper}>
          <ScrollView>
            {
              this.state.logs.map((log, i) => (
                <View
                  key={i}
                  style={styles.logItemContaienr}
                >
                  <Text>{log}</Text>
                </View>
              ))
            }
          </ScrollView>
        </View>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  operateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  webviewWrapper: {
    flex: 1,
  },
  logWrapper: {
    height: 200,
  },
  logItemContaienr: {
    borderBottomWidth: 1,
    borderColor: 'gray',
    paddingHorizontal: 16,
  },
});
