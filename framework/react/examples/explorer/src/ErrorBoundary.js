import React from 'react';

const style = {
  padding: '10px 15px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  backgroundColor: '#eee',
};

class ErrorBoundary extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      info: null,
    };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (error || info) {
      return (
        <div>
          <pre style={style}>
            {`message: ${error.message}\n`}
          </pre>
          <pre style={style}>
            {`stack: ${error.stack}\n`}
          </pre>
          <pre style={style}>
            {`info: ${info.componentStack}\n`}
          </pre>
        </div>
      );
    }
    return React.Children.only(this.props.children);
  }
}

export default ErrorBoundary;
