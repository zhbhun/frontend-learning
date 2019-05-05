import React from 'react';
import {
  View,
  Text,
  DrawerLayoutAndroid,
} from 'react-native';

export default class LockModeTest extends React.Component {

  static title = 'Lock Mode Test';

  state = {
    lockMode: 'unlocked',
  };

  _drawer = null;

  renderContent = () => {
    return (
      <View>
        <Text>
          Lock Mode: {this.state.lockMode}
        </Text>
        <Text onPress={() => this._drawer.openDrawer()}>
          Open Drawer
        </Text>
        <Text onPress={() => this._drawer.closeDrawer()}>
          Close Drawer
        </Text>
        <Text onPress={() => this.setState({ lockMode: 'unlocked' })}>
          Unlock Drawer
        </Text>
        <Text onPress={() => this.setState({ lockMode: 'locked-closed' })}>
          Lock Close Drawer
        </Text>
        <Text onPress={() => this.setState({ lockMode: 'locked-open' })}>
          Lock Open Drawer
        </Text>
      </View>
    );
  }

  render() {
    return (
      <DrawerLayoutAndroid
        ref={(drawer) => this._drawer = drawer}
        drawerLockMode={this.state.lockMode}
        drawerWidth={300}
        renderNavigationView={this.renderContent}
      >
        {this.renderContent()}
      </DrawerLayoutAndroid>
    );
  }

}
