import React from 'react';

class HelloMessage extends React.Component {
  render() {
    return (
      <div>
        Hello {this.props.name}
        <div
          contentEditable="true"
          style={{ minHeight: 100, backgroundColor: 'red' }}
        />
      </div>
    );
  }
}

const Demo = () => <HelloMessage name="Taylor" />;
Demo.path = 'hello-message';
Demo.title = 'Hello Message';

export default Demo;
