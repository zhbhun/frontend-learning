import React from 'react';
import renderer from 'react-test-renderer';
import Clock from '../Clock.react';

jest.useFakeTimers();
Date.now = jest.fn(() => 1482363367071);

it('renders correctly', () => {
  const tree = renderer.create(<Clock />).toJSON();
  expect(tree).toMatchSnapshot();
});
