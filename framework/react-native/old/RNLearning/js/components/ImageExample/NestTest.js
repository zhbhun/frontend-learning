import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
} from 'react-native';

const fullImage = { uri: 'https://facebook.github.io/react/img/logo_og.png' };

export default class NestTest extends React.Component {

  static title = 'Nesting Test';

  render() {
    return (
      <Image
        style={{ width: 60, height: 60, backgroundColor: 'transparent' }}
        source={fullImage}>
        <Text style={styles.nestedText}>
          React
        </Text>
      </Image>
    );
  }
}

const styles = StyleSheet.create({
  nestedText: {
    marginLeft: 12,
    marginTop: 20,
    backgroundColor: 'transparent',
    color: 'white'
  },
});
