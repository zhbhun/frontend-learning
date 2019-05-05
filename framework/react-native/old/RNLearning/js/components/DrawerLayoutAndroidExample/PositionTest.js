import React from 'react';
import {
  StyleSheet,
  View,
  Button,
  Text,
  DrawerLayoutAndroid,
} from 'react-native';

export default class ContentTest extends React.Component {

  static title = 'Position Test';

  state = {
    position: undefined,
  };

  renderContent = () => {
    return (
      <View>
        <View style={styles.blockContainer}>
          <Text style={styles.titleText}>Current Position</Text>
          <Text>{this.state.position || 'default'}</Text>
        </View>
        <View style={styles.blockContainer}>
          <Text style={styles.titleText}>Position Switch</Text>
          <View style={styles.button}>
            <Button
              onPress={() => this.setState({ position: DrawerLayoutAndroid.positions.Left})}
              title="Left"
            />
          </View>
          <View style={styles.button}>
            <Button
              onPress={() => this.setState({ position: DrawerLayoutAndroid.positions.Right})}
              title="Right"
            />
          </View>
        </View>
        <View style={styles.blockContainer}>
          <Text style={styles.titleText}>Tips</Text>
          <Text>1. 测试抽屉打开时，调整位置属性是否刷新抽屉的显示位置 —— 不会</Text>
        </View>
      </View>
    );
  }

  render() {
    return (
      <DrawerLayoutAndroid
        drawerPosition={this.state.position}
        drawerWidth={300}
        renderNavigationView={this.renderContent}
      >
        {this.renderContent()}
      </DrawerLayoutAndroid>
    );
  }

}

const styles = StyleSheet.create({
  blockContainer: {
    marginVertical: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  button: {
    marginVertical: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 6,
  },
});
