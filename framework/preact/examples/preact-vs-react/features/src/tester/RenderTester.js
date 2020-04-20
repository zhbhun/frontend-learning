import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class Render extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      failure: null,
    };
  }

  componentDidCatch(error) {
    this.state({ failure: error });
  }

  render() {
    const { value } = this.props;
    const { failure } = this.state;
    if (failure) {
      return <div>{`${String(value)}: ${failure.message}`}</div>;
    }
    return value;
  }
}

function RenderTester() {
  return (
    <ul>
      {/* <li>
        <Render value={undefined} />
      </li> */}
      <li>
        <Render value={null} />
      </li>
      <li>
        <Render value={true} />
      </li>
      <li>
        <Render value={false} />
      </li>
      <li>
        <Render value={0} />
      </li>
      <li>
        <Render value={1} />
      </li>
      <li>
        <Render value={'a'} />
      </li>
      {/* <li>
        <Render value={{}} />
      </li> */}
      <li>
        <Render value={[1,2,3]} />
      </li>
      {/* <li>
        <Render value={() => null} />
      </li> */}
    </ul>
  );
}

RenderTester.title = 'Render';

export default RenderTester;
