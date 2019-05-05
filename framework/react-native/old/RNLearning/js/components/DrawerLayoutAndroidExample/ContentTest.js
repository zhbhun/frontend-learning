import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  DrawerLayoutAndroid,
} from 'react-native';

export default class ContentTest extends React.Component {

  static title = 'Content Test';

  render() {
    return (
      <DrawerLayoutAndroid
        drawerWidth={300}
        renderNavigationView={() => {
          return (
            <View style={styles.drawer}>
              <Text>Drawer</Text>
            </View>
          );
        }}
      >
        <View style={styles.main}>
          <Text>Main</Text>
        </View>
      </DrawerLayoutAndroid>
    );
  }

}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: '#999',
  },
  main: {
    flex: 1,
    backgroundColor: '#ccc',
  },
});
