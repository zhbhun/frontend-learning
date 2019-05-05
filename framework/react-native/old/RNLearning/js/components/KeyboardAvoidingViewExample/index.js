import React from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  Modal,
  SegmentedControlIOS,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  ScrollView,
} from 'react-native';

class KeyboardAvoidingViewExample extends React.Component {

  static title = '<KeyboardAvoidingView>';
  static description = 'Base component for views that automatically adjust their height or position to move out of the way of the keyboard.';

  state = {
    behavior: 'padding',
    viewModalOpen: false,
    scrollViewModalOpen: false,
  };

  onSegmentChange = (segment) => {
    this.setState({behavior: segment.toLowerCase()});
  };

  renderInputs(count) {
    const inputs = [];
    for (let i = 0; i < count; i++) {
      inputs.push(
        <TextInput
          key={i}
          placeholder={`${i}`}
          style={styles.textInput}
        />
      );
    }
    return inputs;
  }

  renderView() {
    const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
    return (
      <View style={styles.outerContainer}>
        <Modal
          animationType="fade"
          visible={this.state.viewModalOpen}
          onRequestClose={() => null}
        >
          <View style={styles.wrapperContainer}>
            <Wrapper
              behavior={this.state.behavior}
              style={styles.container}
            >
              {
                Platform.OS === 'ios' ?
                  <SegmentedControlIOS
                    onValueChange={this.onSegmentChange}
                    selectedIndex={this.state.behavior === 'padding' ? 0 : 1}
                    style={styles.segment}
                    values={['Padding', 'Position']}
                  /> :
                  null
              }
              {this.renderInputs(10)}
            </Wrapper>
          </View>
          <TouchableHighlight
            onPress={() => this.setState({ viewModalOpen: false })}
            style={styles.closeButton}>
            <Text>Close</Text>
          </TouchableHighlight>
        </Modal>

        <TouchableHighlight onPress={() => this.setState({ viewModalOpen: true })}>
          <Text>Open View Example</Text>
        </TouchableHighlight>
      </View>
    );
  }

  renderScrollView = () => {
    const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
    return (
      <View style={styles.outerContainer}>
        <Modal
          animationType="fade"
          visible={this.state.scrollViewModalOpen}
          onRequestClose={() => null}
        >
          <ScrollView style={styles.wrapperContainer}>
            <Wrapper
              behavior={this.state.behavior}
              style={styles.container}
            >
              {
                Platform.OS === 'ios' ?
                  <SegmentedControlIOS
                    onValueChange={this.onSegmentChange}
                    selectedIndex={this.state.behavior === 'padding' ? 0 : 1}
                    style={styles.segment}
                    values={['Padding', 'Position']}
                  /> :
                  null
              }
              {this.renderInputs(20)}
            </Wrapper>
          </ScrollView>
          <TouchableHighlight
            onPress={() => this.setState({ scrollViewModalOpen: false })}
            style={styles.closeButton}>
            <Text>Close</Text>
          </TouchableHighlight>
        </Modal>

        <TouchableHighlight onPress={() => this.setState({ scrollViewModalOpen: true })}>
          <Text>Open ScrollView Example</Text>
        </TouchableHighlight>
      </View>
    );
  };

  render() {
    return (
      <View style={styles.rootContainer}>
        {this.renderScrollView()}
        {this.renderView()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
  },
  wrapperContainer: {
    flex: 1,
    marginVertical: 30,
    paddingVertical: 15,
    backgroundColor: 'blue',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#777',
  },
  textInput: {
    borderRadius: 5,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 10,
  },
  segment: {
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    left: 10,
  }
});

module.exports = KeyboardAvoidingViewExample;
