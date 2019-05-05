import React, {Component} from 'react'
import {connect} from 'react-redux'
import Nav from './common/Nav'

class App extends Component {
  render () {
    return (
      <div className='wrapper'>
        <Nav loggedIn={this.props.data.loggedIn}
          currentlySending={this.props.data.currentlySending}
          history={this.props.history}
          dispatch={this.props.dispatch}
          location={this.props.location} />
        {this.props.children}
      </div>
    )
  }
}

App.propTypes = {
  data: React.PropTypes.object,
  history: React.PropTypes.object,
  location: React.PropTypes.object,
  children: React.PropTypes.object,
  dispatch: React.PropTypes.func
}

function select (state) {
  return {
    data: state
  }
}

export default connect(select)(App)
