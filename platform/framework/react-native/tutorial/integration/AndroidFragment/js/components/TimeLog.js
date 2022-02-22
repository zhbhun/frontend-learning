/* @flow */
import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';

class Timelog extends Component {
  render() {
    return (
      <View>
        <Text style={styles.time}>{Date.now()}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  time: {
    textAlign: 'center',
  },
});


export default Timelog;
