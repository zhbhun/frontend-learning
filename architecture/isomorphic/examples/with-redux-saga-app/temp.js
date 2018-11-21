import React, { Component } from 'react';
import { END } from 'redux-saga';

function hoc(config) {
  return BaseComponent => {
    class WrappedComponent extends Component {
      static displayName = `withReduxSaga(${BaseComponent.displayName ||
        BaseComponent.name ||
        'BaseComponent'})`;

      static async getInitialProps(props) {
        const { isServer, store } = props.ctx;
        // if (!isServer) {
        //   store.runSagaTask();
        // }
        let pageProps = {};
        if (BaseComponent.getInitialProps) {
          pageProps = await BaseComponent.getInitialProps(props);
        }

        // Keep saga running on the client (async mode)
        if (config.async && !isServer) {
          return pageProps;
        }
        // Restart saga on the client (sync mode)
        // Force saga to end in all other cases
        store.dispatch(END);
        const x = store.sagaTask.done;
        if (!isServer) {
          window.x = x;
        }
        await x;

        // Restart saga on the client (sync mode)
        if (!isServer) {
          store.runSagaTask();
        }

        return pageProps;
      }

      render() {
        return <BaseComponent {...this.props} />;
      }
    }

    return WrappedComponent;
  };
}

function withReduxSaga(arg) {
  const defaultConfig = { async: false };

  if (typeof arg === 'function') {
    return hoc(defaultConfig)(arg);
  }

  return hoc({ ...defaultConfig, ...arg });
}

export default withReduxSaga;
