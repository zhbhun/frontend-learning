import React, { PropTypes, Component } from 'react';

import IndexSidebar from './IndexSidebar';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div>
        <h1>Antd Design</h1>
        <div className="siderbar">
          <IndexSidebar />
        </div>
        <div className="content">
          {this.props.children}
        </div>
      </div>
    );
  }
}

App.propTypes = {
  children: PropTypes.node,
};
