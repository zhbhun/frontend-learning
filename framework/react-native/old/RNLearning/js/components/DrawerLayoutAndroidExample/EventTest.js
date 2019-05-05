import React from 'react';
import {
  View,
  Text,
  DrawerLayoutAndroid,
} from 'react-native';

export default class EventTest extends React.Component {

  static title = 'Event Test';

  _drawer = null;

  renderContent = () => {
    return (
      <View>
        <Text onPress={() => this._drawer.openDrawer()}>
          Open Drawer
        </Text>
        <Text onPress={() => this._drawer.closeDrawer()}>
          Close Drawer
        </Text>
      </View>
    );
  }

  render() {
    return (
      <DrawerLayoutAndroid
        ref={(drawer) => this._drawer = drawer}
        drawerWidth={300}
        onDrawerClose={() => console.warn(Date.now(), 'close')}
        onDrawerOpen={() => console.warn(Date.now(), 'open')}
        onDrawerSlide={() => console.warn(Date.now(), 'slide')}
        onDrawerStateChanged={(state) => console.warn(Date.now(), 'state changeed', state)}
        renderNavigationView={this.renderContent}
      >
        {this.renderContent()}
      </DrawerLayoutAndroid>
    );
  }

}
