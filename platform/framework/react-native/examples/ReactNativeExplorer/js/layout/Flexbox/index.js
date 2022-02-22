import React from 'react';
import {
  View,
} from 'react-native';

export default {
  path: 'flexbox',
  component: {
    title: 'Flexbox',
    description: 'Flexbox is designed to provide a consistent layout on different screen sizes.',
  },
  childRoutes: [
    {
      path: 'direction',
      component: {
        title: 'Flex Direction',
        description: 'Adding flexDirection to a component\'s style determines the primary axis of its layout. Should the children be organized horizontally (row) or vertically (column) ? The default is column.',
        render: function () {
          return (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ width: 50, height: 50, backgroundColor: 'powderblue' }} />
              <View style={{ width: 50, height: 50, backgroundColor: 'skyblue' }} />
              <View style={{ width: 50, height: 50, backgroundColor: 'steelblue' }} />
            </View>
          );
        },
      },
    },
  ],
};
