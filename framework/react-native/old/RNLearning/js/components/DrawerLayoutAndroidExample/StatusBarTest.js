import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ToolbarAndroid,
  Button,
  DrawerLayoutAndroid,
} from 'react-native';

export default class StatusBarTest extends React.Component {

  static title = 'Status Bar Test';
  static navigationBarHidden = true;

  state = {
    /**
     * twitter / netease - 某种颜色的导航条 + 某种颜色的状态栏（或者颜色一致），某种背景色的抽屉 + 透明状态栏
     * evernote - 颜色一致的导航条和状态栏，某种颜色的抽屉 + 不透明不变色的状态栏
     * wiznote - 某种颜色的导航条 + 透明的状态栏，某种颜色的抽屉 + 透明的状态栏
     */
    mode: 'twitter',
    drawerOpen: false,
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.drawerOpen !== this.state.drawerOpen) {
      this.setState({ dragging: false });
    }
  }

  renderMain() {
    return (
      <View>
        <Text>
          <Text>Mode：</Text>
          <Text>{this.state.mode}</Text>
        </Text>
        <View style={styles.buttons}>
          <Button
            title="Twitter"
            onPress={() => this.setState({ mode: 'twitter' })}
          />
          <Button
            title="Evernote"
            onPress={() => this.setState({ mode: 'evernote' })}
          />
          <Button
            title="Wiznote"
            onPress={() => this.setState({ mode: 'wiznote' })}
          />
        </View>
      </View>
    )
  }

  renderTwitter = () => {
    return (
      <DrawerLayoutAndroid
        drawerWidth={300}
        renderNavigationView={() => {
          return (
            <View>
              <View style={[styles.profile, { backgroundColor: '#2196F3' }]} />
              <Text>...</Text>
            </View>
          );
        }}
        statusBarBackgroundColor="#455A64"
      >
        <View style={styles.wrapper}>
          <ToolbarAndroid
            title="Twitter"
            style={[styles.navbar]}
          />
          <View style={styles.main}>
            {this.renderMain()}
          </View>
        </View>
      </DrawerLayoutAndroid>
    );
  }

  renderEvernote = () => {
    const navbarColor = '#4CAF50';
    return (
      <DrawerLayoutAndroid
        drawerWidth={300}
        renderNavigationView={() => {
          return (
            <View>
              <View style={[styles.profile, { backgroundColor: '#388E3C', height: 150 }]} />
              <Text>...</Text>
            </View>
          );
        }}
      >
        <View style={styles.wrapper}>
          <StatusBar
            backgroundColor={navbarColor}
            barStyle="light-content"
          />
          <ToolbarAndroid
            title="Evernote"
            style={[styles.navbar, { backgroundColor: navbarColor }]}
          />
          <View style={styles.main}>
            {this.renderMain()}
          </View>
        </View>
      </DrawerLayoutAndroid>
    );
  }

  renderWiznote = () => {
    const { drawerOpen } = this.state;
    const drawerStyle = drawerOpen;

    const profileBackgroundColor = '#03A9F4';
    const navbarBackgroundColor = '#2196F3';

    return (
      <View style={[styles.container, { paddingTop: StatusBar.currentHeight, backgroundColor: navbarBackgroundColor } ]}>
        <StatusBar
          backgroundColor={'rgba(0, 0, 0, 0.3)'}
          barStyle="light-content"
          translucent
        />
        <DrawerLayoutAndroid
          drawerWidth={300}
          onDrawerStateChanged={(evt) => {
            if (evt === 'Settling') {
              this.setState({ drawerOpen: !this.state.drawerOpen });
            }
          }}
          renderNavigationView={() => {
            return (
              <View>
                <View style={[styles.profile, { backgroundColor: profileBackgroundColor, height: 150 }]} />
                <Text>...</Text>
              </View>
            );
          }}
        >
          <View style={[styles.wrapper]}>
            <ToolbarAndroid
              title="Wiznote"
              style={[styles.navbar, { backgroundColor: navbarBackgroundColor }]}
            />
            <View style={styles.main}>
              {this.renderMain()}
            </View>
          </View>
        </DrawerLayoutAndroid>
      </View>
    );
  }

  render() {
    const { mode } = this.state;
    if (mode === 'twitter') {
      return this.renderTwitter();
    } else if (mode === 'evernote') {
      return this.renderEvernote();
    } else if (mode === 'wiznote') {
      return this.renderWiznote();
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  navbar: {
    height: 56,
  },
  profile: {
    height: 150,
  },
  main: {
    flex: 1,
    backgroundColor: '#fff',
  },
  buttons: {
    height: 150,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
  },
});
