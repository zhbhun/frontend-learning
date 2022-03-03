import React, { Component, createRef } from 'react';
import { render } from 'react-dom';
import Page from '../../Page';

class RenderExample extends Component {
  constructor(props) {
    super(props);

    this.container = createRef();
  }

  componentDidMount() {
    this.container.current.innerHTML = '<div>unclick</div><div>click me!</div>';
    const outContainer = document.createElement('div');
    outContainer.style = 'position: fixed; bottom: 0; left: 0; right: 0';
    outContainer.innerHTML = '<div>unclick</div><div>unclick</div>';
    document.body.appendChild(outContainer);
    this.outContainer = outContainer;
  }

  handleClick = () => {
    render(<div>clicked.</div>, this.container.current);
    render(<div>clicked.</div>, this.outContainer);
  };

  render() {
    return <div ref={this.container} onClick={this.handleClick} />;
  }
}

export default Page.create({
  path: 'render',
  title: 'render(element, container[, callback])',
})(RenderExample);
