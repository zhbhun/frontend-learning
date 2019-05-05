import React, { Component } from 'react';
import {
  View,
  WebView,
  Switch,
} from 'react-native';

import Selectable from './html/Selectable.html';
import Selectdisable from './html/Selectdisable.html';

const BGWASH = 'rgba(255,255,255,0.8)';

/**
 * 如何禁用 WebView 文本复制
 */
export default class DisableTextSelection extends Component {

  constructor(props) {
    super(props);

    this.state = {
      disable: false,
    };
  }

  handleChange = (value) => {
    this.setState({ disable: value });
  }

  render = () => {
    const { disable } = this.state;
    return (
      <View style={{ flex: 1 }}>
        <Switch
          value={disable}
          onValueChange={this.handleChange}
        />
        <WebView
          {...this.props}
          style={{
            backgroundColor: BGWASH,
            height: 100,
          }}
          source={disable ? Selectdisable : Selectable}
          scalesPageToFit={true}
        />
      </View>
    );
  }

}

DisableTextSelection.title = 'Disable Text Selection';
