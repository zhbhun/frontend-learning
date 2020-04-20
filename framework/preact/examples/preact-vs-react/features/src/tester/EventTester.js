import React, { PureComponent } from 'react';

class EventTester extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      event: null,
    };
  }

  componentDidCatch(error) {
    this.state({ failure: error });
  }

  handleClick = (event) => {
    console.log(event === event.nativeEvent, event);
    this.setState({
      event: Object.keys(event),
    });
  };

  render() {
    return (
      <div>
        <button onClick={this.handleClick}>click me</button>
        <pre>{JSON.stringify(this.state.event)}</pre>
      </div>
    );
  }
}

EventTester.title = 'Event';

export default EventTester;
