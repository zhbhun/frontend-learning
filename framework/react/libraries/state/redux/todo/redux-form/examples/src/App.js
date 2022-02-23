import React, { Component } from 'react'
import { Link } from 'react-router'

class App extends Component {
  render() {
    const { children } = this.props
    return (
      <div>
        <h1>Hello Redux Form</h1>
        <ul>
          <li>
            <Link to="simple-form">Simple Form</Link>
          </li>
          <li>
            <Link to="sync-validation">Sync Validation</Link>
          </li>
          <li>
            <Link to="field-level-validation">Field Level Validation</Link>
          </li>
          <li>
            <Link to="submit-validation">Submit Validation</Link>
          </li>
          <li>
            <Link to="async-validation">Async Validation</Link>
          </li>
        </ul>
        {children}
      </div>
    );
  }
}

export default App
