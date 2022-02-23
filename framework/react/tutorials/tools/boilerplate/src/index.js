import React from 'react'
import ReactDOM from 'react-dom'
import { browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import configureStore from './store/configureStore'

const store = configureStore()
const history = syncHistoryWithStore(browserHistory, store)

const rootElement = document.getElementById('root');
let render = () => {
  const Root = require('./containers/Root').default
  ReactDOM.render(
    <Root store={store} history={history} />,
    rootElement
  )
}

if (module.hot) {
  // Support hot reloading of components
  // and display an overlay for runtime errors
  const renderApp = render
  render = () => {
    try {
      renderApp()
    } catch (error) {
      console.error(error);
    }
  }
  const rerender = () => {
    setTimeout(render)
  }
  module.hot.accept('./containers/Root', rerender)
}

render()
