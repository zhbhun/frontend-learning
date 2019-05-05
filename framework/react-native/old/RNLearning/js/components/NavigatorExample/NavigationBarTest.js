var React = require('react');
var ReactNative = require('react-native');
var {
  Navigator,
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  TouchableHighlight,
  TouchableOpacity,
} = ReactNative;

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

var NavigationBarRouteMapper = {

  LeftButton: function(route, navigator, index, navState) {
    console.warn(JSON.stringify(navState));
    if (index === 0) {
      return null;
    }

    var previousRoute = navState.routeStack[index - 1];
    return (
      <TouchableOpacity
        onPress={() => navigator.pop()}
        style={styles.navBarLeftButton}>
        <Text style={[styles.navBarText, styles.navBarButtonText]}>
          {previousRoute.title}
        </Text>
      </TouchableOpacity>
    );
  },

  RightButton: function(route, navigator, index, navState) {
    return (
      <TouchableOpacity
        onPress={() => navigator.push(newRandomRoute())}
        style={styles.navBarRightButton}>
        <Text style={[styles.navBarText, styles.navBarButtonText]}>
          Next
        </Text>
      </TouchableOpacity>
    );
  },

  Title: function(route, navigator, index, navState) {
    return (
      <Text style={[styles.navBarText, styles.navBarTitleText]}>
        {route.title} [{index}]
      </Text>
    );
  },

};

function newRandomRoute() {
  return {
    title: '#' + Math.ceil(Math.random() * 1000),
  };
}

class NavigationBarSample extends React.Component {

  static title = 'Navigation Bar Test';
  static description = 'Use this to provide an optional component representing a navigation bar that is persisted across scene transitions. This component will receive two props: navigator and navState representing the navigator component and its state. The component is re-rendered when the route changes.';

  render() {
    return (
      <Navigator
        initialRoute={newRandomRoute()}
        renderScene={(route, navigator) => (
          <ScrollView style={styles.scene}>
            <Text style={styles.messageText}>{route.content}</Text>
            <NavButton
              onPress={() => {
                navigator.immediatelyResetRouteStack([
                  newRandomRoute(),
                  newRandomRoute(),
                  newRandomRoute(),
                ]);
              }}
              text="Reset w/ 3 scenes"
            />
          </ScrollView>
        )}
        navigationBar={
          <Navigator.NavigationBar
            routeMapper={NavigationBarRouteMapper}
            style={styles.navBar}
          />
        }
      />
    );
  }
}

var styles = StyleSheet.create({
  messageText: {
    fontSize: 17,
    fontWeight: '500',
    padding: 15,
    marginTop: 50,
    marginLeft: 15,
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
  navBar: {
    backgroundColor: 'white',
  },
  navBarText: {
    fontSize: 16,
    marginVertical: 10,
  },
  navBarTitleText: {
    flex: 1,
    justifyContent: 'center',
    color: '#373E4D',
    fontWeight: '500',
  },
  navBarLeftButton: {
    flex: 1,
    justifyContent: 'center',
  },
  navBarRightButton: {
    flex: 1,
    justifyContent: 'center',
  },
  navBarButtonText: {
    color: '#5890FF',
  },
  scene: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#EAEAEA',
  },
});

module.exports = NavigationBarSample;
