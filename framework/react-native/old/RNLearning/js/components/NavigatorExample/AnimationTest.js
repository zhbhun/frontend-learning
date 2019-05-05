import React from 'react';
import {
  StyleSheet,
  Navigator,
  ScrollView,
  TouchableHighlight,
  View,
  Text,
} from 'react-native';

class NavButton extends React.Component {
  render() {
    return (
      <TouchableHighlight
        style={styles.button}
        underlayColor="#B5B5B5"
        onPress={this.props.onPress}>
        <Text style={styles.buttonText}>{this.props.text}</Text>
      </TouchableHighlight>
    );
  }
}

export default class AnimationTest extends React.Component {

  static title = 'Animation Test';
  static description = 'ConfigureScene is optional function where you can configure scene animations and gestures. Will be invoked with route and routeStack parameters, where route corresponds to the current scene being rendered by the Navigator and routeStack is the set of currently mounted routes that the navigator could transition to.';

  renderScene = (route, nav) => {
    return (
      <View style={styles.scene}>
        <Text style={styles.messageText}>{route.message}</Text>
        <ScrollView style={styles.operationsScrollContainer}>
          <NavButton
            onPress={() => {
              nav.pop();
            }}
            text="pop"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe right to dismiss`,
                sceneConfig: Navigator.SceneConfigs.PushFromRight,
              });
            }}
            text="PushFromRight: cover in from right"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe right to dismiss`,
                sceneConfig: Navigator.SceneConfigs.FloatFromRight,
              });
            }}
            text="FloatFromRight: Float in from right"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe left to dismiss`,
                sceneConfig: Navigator.SceneConfigs.FloatFromLeft,
              });
            }}
            text="FloatFromLeft: float in from left"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe up to dismiss`,
                sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
              });
            }}
            text="FloatFromBottom float in from bottom"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Pop to dismiss`,
                sceneConfig: Navigator.SceneConfigs.FloatFromBottomAndroid,
              });
            }}
            text="FloatFromBottomAndroid: float in from bottom by android"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Pop to dismiss`,
                sceneConfig: Navigator.SceneConfigs.FadeAndroid,
              });
            }}
            text="FadeAndroid: fade in by android"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe left to dismiss`,
                sceneConfig: Navigator.SceneConfigs.SwipeFromLeft,
              });
            }}
            text="SwipeFromLeft: swipe in from left"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe right to dismiss`,
                sceneConfig: Navigator.SceneConfigs.HorizontalSwipeJump,
              });
            }}
            text="HorizontalSwipeJump: swipe in from right"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe left to dismiss`,
                sceneConfig: Navigator.SceneConfigs.HorizontalSwipeJumpFromRight,
              });
            }}
            text="HorizontalSwipeJumpFromRight: float in from left"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Swipe left to dismiss`,
                sceneConfig: Navigator.SceneConfigs.HorizontalSwipeJumpFromLeft,
              });
            }}
            text="HorizontalSwipeJumpFromLeft: swipe in from left"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Pop to dismiss`,
                sceneConfig: Navigator.SceneConfigs.VerticalUpSwipeJump,
              });
            }}
            text="VerticalUpSwipeJump: float in from bottom"
          />
          <NavButton
            onPress={() => {
              nav.push({
                message: `Pop to dismiss`,
                sceneConfig: Navigator.SceneConfigs.VerticalDownSwipeJump,
              });
            }}
            text="VerticalDownSwipeJump: float in from top"
          />
        </ScrollView>
      </View>
    );
  };

  render() {
    return (
      <Navigator
        initialRoute={{ message: 'First Scene' }}
        renderScene={this.renderScene}
        configureScene={(route) => {
          if (route.sceneConfig) {
            return route.sceneConfig;
          }
          return Navigator.SceneConfigs.FloatFromBottom;
        }}
      />
    );
  }

}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    backgroundColor: '#EAEAEA',
  },
  messageText: {
    fontSize: 17,
    fontWeight: '500',
    padding: 15,
    marginLeft: 15,
  },
  operationsScrollContainer: {
    flex: 1,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CDCDCD',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '500',
  },
});
