import React from 'react';
import {
  Alert,
  Button,
  View,
} from 'react-native';

const onButtonPress = () => {
  Alert.alert('Button has been pressed!');
};

export default {
  path: 'button',
  component: {
    title: '<Button>',
    description: 'A basic button component that should render nicely on any platform. Supports a minimal level of customization.',
  },
  childRoutes: [
    {
      path: 'simple',
      component: {
        title: 'Simple Button',
        description: 'The title and onPress handler are required. It is ' +
        'recommended to set accessibilityLabel to help make your app usable by ' +
        'everyone.',
        render: function () {
          return (
            <Button
              onPress={onButtonPress}
              title="Press Me"
              accessibilityLabel="See an informative alert"
            />
          );
        },
      },
    },
    {
      path: 'adjusted-color',
      component: {
        title: 'Adjusted color',
        description: 'Adjusts the color in a way that looks standard on each ' +
        'platform. On iOS, the color prop controls the color of the text. On ' +
        'Android, the color adjusts the background color of the button.',
        render: function () {
          return (
            <Button
              onPress={onButtonPress}
              title="Press Purple"
              color="#841584"
              accessibilityLabel="Learn more about purple"
            />
          );
        },
      },
    },
    {
      path: 'adjusted-size',
      component: {
        title: 'Adjusted size',
        description: '不能直接通过修改样式 width 和 height 来调整按钮大小，但可以在外层增加一个 View，并设置该 View 的宽度来调整按钮宽度',
        render: function () {
          return (
            <View style={{ height: 50, width: 100 }}>
              <Button
                onPress={onButtonPress}
                title="Press Me"
                accessibilityLabel="See an informative alert"
              />
            </View>
          );
        },
      },
    },
    {
      path: 'fix-to-text-layout',
      component: {
        title: 'Fit to text layout',
        description: 'This layout strategy lets the title define the width of ' +
        'the button',
        render: function () {
          return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button
                onPress={onButtonPress}
                title="This looks great!"
                accessibilityLabel="This sounds great!"
              />
              <Button
                onPress={onButtonPress}
                title="Ok!"
                color="#841584"
                accessibilityLabel="Ok, Great!"
              />
            </View>
          );
        },
      },
    },
    {
      path: 'disabled-button',
      component: {
        title: 'Disabled Button',
        description: 'All interactions for the component are disabled.',
        render: function () {
          return (
            <Button
              disabled
              onPress={onButtonPress}
              title="I Am Disabled"
              accessibilityLabel="See an informative alert"
            />
          );
        },
      },
    },
  ],
};
