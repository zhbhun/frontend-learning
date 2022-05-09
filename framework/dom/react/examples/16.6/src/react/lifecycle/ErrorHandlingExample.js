import React, { Component } from "react";

const NormalChild = () => <div>normal</div>;
const ErrorChild = () => <div>{window.unkown.test()}</div>;

class ErrorHandlingExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      error: false,
    };
  }
  componentDidCatch(error, info) {
    console.log(error, info);
    this.setState({ error: true });
  }

  render() {
    return (
      <div>
        <NormalChild />
        {this.state.error ? null : <ErrorChild />}
      </div>
    );
  }
}

export default ErrorHandlingExample;
