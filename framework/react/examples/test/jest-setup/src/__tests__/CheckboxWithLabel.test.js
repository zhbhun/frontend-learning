import React from 'react';
import Enzyme, {shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {render, fireEvent, cleanup} from 'react-testing-library';
import CheckboxWithLabel from '../CheckboxWithLabel';

// automatically unmount and cleanup DOM after the test is finished.
afterEach(cleanup);
it('CheckboxWithLabel changes the text after click by react-testing-library', () => {
  const {queryByLabelText, getByLabelText} = render(
    <CheckboxWithLabel labelOn="On" labelOff="Off" />,
  );

  expect(queryByLabelText(/off/i)).toBeTruthy();

  fireEvent.click(getByLabelText(/off/i));

  expect(queryByLabelText(/on/i)).toBeTruthy();
});

Enzyme.configure({adapter: new Adapter()});
it('CheckboxWithLabel changes the text after click by enzyme', () => {
  // Render a checkbox with label in the document
  const checkbox = shallow(<CheckboxWithLabel labelOn="On" labelOff="Off" />);

  expect(checkbox.text()).toEqual('Off');

  checkbox.find('input').simulate('change');

  expect(checkbox.text()).toEqual('On');
});
