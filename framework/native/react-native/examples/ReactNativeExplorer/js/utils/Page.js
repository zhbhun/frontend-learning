import React, { PropTypes, Component } from 'react';
import { View, Text } from 'react-native';

import Navbar from './Navbar';
import ExampleList from './ExampleList';

class Page extends Component {

  static propTypes = {
    description: PropTypes.string,
    examples: PropTypes.array,
    title: PropTypes.string,
    readme: PropTypes.string,
    render: PropTypes.func,
  };

  static contextTypes = {
    goBack: PropTypes.func,
  };

  goBack = () => {
    this.context.goBack();
  }

  render = () => {
    const { title, description, examples, render } = this.props;
    return (
      <View>
        <Navbar
          leftButton={{
            title: '返回',
            handler: this.goBack,
          }}
          title={{
            title: title,
          }}
        />
        <View>
          <Text>{title}</Text>
          <Text>{description}</Text>
        </View>
        {render ? render() : null}
        {examples ? <ExampleList examples={examples} /> : null}
      </View>
    );
  }
}


export default Page;
