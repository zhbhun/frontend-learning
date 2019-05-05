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

export default class RouteAPITest extends React.Component {

  static title = 'Route API Test';
  static description = 'immediatelyResetRouteStack(nextRouteStack), jumpTo(route), jumpForward(0)...';

  renderScene = (route, nav) => {
    return (
      <View style={styles.scene}>
        <Text style={styles.messageText}>{route.message}</Text>
        <ScrollView style={styles.operationsScrollContainer}>
          <NavButton
            onPress={() => {
              nav.immediatelyResetRouteStack([
                { message: 'First Scene' },
                { message: 'Second Scene' },
                { message: 'Third Scene' },
              ]);
            }}
            text="immediatelyResetRouteStack"
          />
          <NavButton
            onPress={() => {
              try {
                nav.jumpBack();
              } catch (e) {
                console.warn(e);
              }
            }}
            text="jumpBack"
          />
          <NavButton
            onPress={() => {
              try {
                nav.jumpForward();
              } catch (e) {
                console.warn(e);
              }
            }}
            text="jumpForward"
          />
          <NavButton
            onPress={() => {
              try {
                nav.jumpTo(nav.state.routeStack[1]);
              } catch (e) {
                console.warn(e);
              }
            }}
            text="jumpTo(route index of 1)"
          />
          <NavButton
            onPress={() => {
              nav.pop();
            }}
            text="pop"
          />
          <NavButton
            onPress={() => {
              nav.popN(1);
            }}
            text="popN(1)"
          />
          <NavButton
            onPress={() => {
              nav.popN(2);
            }}
            text="popN(2)"
          />
          <NavButton
            onPress={() => {
              try {
                nav.popToRoute((nav.state.routeStack[0]));
              } catch (e) {
                console.warn(e);
              }
            }}
            text="popToRoute(index of 0)"
          />
          <NavButton
            onPress={() => {
              try {
                nav.popToRoute((nav.state.routeStack[1]));
              } catch (e) {
                console.warn(e);
              }
            }}
            text="popToRoute(index of 1)"
          />
          <NavButton
            onPress={() => {
              nav.popToTop();
            }}
            text="Pop to top"
          />
          <NavButton
            onPress={() => {
              nav.push({ message: `${nav.state.presentedIndex + 2}rd Scene` });
            }}
            text="push"
          />
          <NavButton
            onPress={() => {
              nav.replace({ message: 'Replace Scene'});
            }}
            text="replace"
          />
          <NavButton
            onPress={() => {
              nav.replaceAtIndex(
                { message: 'Replace Scene'},
                0,
                () => console.warn('replaced'),
              );
            }}
            text="replaceAtIndex(, 0, )"
          />
          <NavButton
            onPress={() => {
              nav.replaceAtIndex(
                { message: 'Replace Scene'},
                1,
                () => console.warn('replaced'),
              );
            }}
            text="replaceAtIndex(, 1, )"
          />
          <NavButton
            onPress={() => {
              nav.replaceAtIndex(
                { message: 'Replace Scene'},
                -1,
                () => console.warn('replaced'),
              );
            }}
            text="replaceAtIndex(, -1, )"
          />
          <NavButton
            onPress={() => {
              nav.replacePrevious({ message: 'Replace Scene'});
            }}
            text="replacePrevious"
          />
          <NavButton
            onPress={() => {
              nav.replacePreviousAndPop( { message: 'Replace Scene'} );
            }}
            text="replacePreviousAndPop"
          />
          <NavButton
            onPress={() => {
              nav.resetTo({ message: 'Reset Scene'});
            }}
            text="resetTo"
          />
          <NavButton
            onPress={() => {
              console.warn(JSON.stringify(nav.getCurrentRoutes()));
            }}
            text="getCurrentRoutes"
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
