import React from 'react';
import PropTypes from 'prop-types';

function Child({ bool, number }) {
  return <div>{`bool: ${typeof bool}, number: ${typeof number}`}</div>;
}

Child.propTypes = {
  bool: PropTypes.bool,
  number: PropTypes.number,
};

function PropTypesTester() {
  return <Child bool={1} number />;
}

PropTypesTester.title = 'PropTypes';

export default PropTypesTester;
