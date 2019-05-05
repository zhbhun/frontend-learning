import React from 'react';
import {
  View,
} from 'react-native';

export default {
  path: 'box',
  component: {
    title: 'Box',
    description: '',
  },
  childRoutes: [
    {
      path: 'width',
      component: {
        title: 'Width',
        description: 'width sets the width of this component, It works similarly to width in CSS, but in React Native you must use points or percentages. Ems and other units are not supported.',
        render: function () {
          return (
            <View style={{ height: 50, flexDirection: 'row', backgroundColor: 'green' }}>
              <View style={{ width: 50, backgroundColor: 'red' }} />
              <View style={{ width: '50%', backgroundColor: 'blue' }} />
            </View>
          );
        },
      },
    },
    {
      path: 'height',
      component: {
        title: 'Height',
        description: 'Height sets the height of this component, It works similarly to height in CSS, but in React Native you must use points or percentages. Ems and other units are not supported.',
        render: function () {
          return (
            <View style={{ height: 100, flexDirection: 'row', backgroundColor: 'green' }}>
              <View style={{ width: '50%', height: 30, backgroundColor: 'red' }} />
              <View style={{ width: '50%', height: '50%', backgroundColor: 'blue' }} />
            </View>
          );
        },
      },
    },
    {
      path: 'margin',
      component: {
        title: 'Margin',
        description: 'Setting margin has the same effect as setting each of marginTop, marginLeft, marginBottom, and marginRight.',
        render: function () {
          return (
            <View style={{ height: 100, backgroundColor: 'green' }}>
              <View style={{ marginTop: '50%', width: 50, height: 50, backgroundColor: 'red' }} />
            </View>
          );
        },
      },
    },
  ],
};
